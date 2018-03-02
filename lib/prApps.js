const {struct} = require('superstruct')
const {Writable} = require('stream')
const FlynnService = require('./flynnService')

const Config = struct({
  env: 'object?',
  resources: struct.optional(['string']),
  routes: 'object?'
})

function injectConfigVars (rawConfig, vars) {
  let configString = JSON.stringify(rawConfig)
  Object.entries(vars).forEach(([varName, varValue]) => {
    configString = configString.replace(new RegExp(`\\$\{${varName}}`, 'g'), varValue)
  })
  return JSON.parse(configString)
}

function loadFlynnInfo ({domain}) {
  return {
    prAppsDomain: domain,
    clusterDomain: domain.replace(/^[^.]+\./, '')
  }
}

module.exports = class PrApps {
  constructor ({
    codeHostingServiceApi,
    scmProject,
    flynnApiClientFactory,
    appInfo,
    deploymentRepo,
    configLoader
  }) {
    this.scmProject = scmProject
    this.codeHostingServiceApi = codeHostingServiceApi
    this.deploymentRepo = deploymentRepo
    this.configLoader = configLoader

    const {clusterDomain, prAppsDomain} = loadFlynnInfo(appInfo)
    const flynnApiClient = flynnApiClientFactory(clusterDomain)
    this.flynnService = new FlynnService(flynnApiClient)
    this.prAppsDomain = prAppsDomain
  }

  async deployPullRequest ({branch, prNumber, version}) {
    await this._deploy({branch, prNumber, version, newApp: true})
  }

  async deployUpdate ({branch, prNumber, version}) {
    await this._deploy({branch, prNumber, version, newApp: false})
  }

  async destroyPrApp (prNumber) {
    const appName = `pr-${prNumber}`
    // TODO clean up deployments
    await this.flynnService.destroyApp(appName)
  }

  async getDeployment (id) {
    const deployment = await this.deploymentRepo.get(id)
    return deployment
  }

  async _deploy ({branch, prNumber, newApp, version}) {
    const appName = `pr-${prNumber}`

    await this.scmProject.clone(branch, async (localProject) => {
      const flynnApp = newApp
        ? await this.flynnService.createApp(appName)
        : await this.flynnService.getApp(appName)

      const deployment = await this.deploymentRepo.create({
        status: 'pending'
      })
      const deploymentUrl = `https://${this.prAppsDomain}/deployments/${deployment.id}`

      const codeHostingServiceDeployment = await this.codeHostingServiceApi.createDeployment(branch)
      await this.codeHostingServiceApi.updateDeploymentStatus(
        codeHostingServiceDeployment,
        Object.assign({deploymentUrl}, deployment)
      )

      try {
        deployment.status = 'failure'
        const config = this._loadConfig(localProject.path, flynnApp)

        await flynnApp.withConfig({config, version}, async () => {
          const logCollector = new Writable({
            write: async (chunk, encoding, next) => {
              await this.deploymentRepo.appendLog(deployment, chunk.toString())
              next()
            }
          })

          await localProject.push(flynnApp.gitUrl, logCollector)
        })
        deployment.status = 'success'
        deployment.deployedAppUrl = flynnApp.webUrl
      } finally {
        await Promise.all([
          this.deploymentRepo.save(deployment),
          this.codeHostingServiceApi.updateDeploymentStatus(
            codeHostingServiceDeployment,
            Object.assign({deploymentUrl}, deployment)
          )
        ])
      }
    })
  }

  _loadConfig (path, flynnApp) {
    const rawConfig = this.configLoader.load(path)
    if (rawConfig) {
      return Config(injectConfigVars(
        rawConfig,
        {APP_DOMAIN: flynnApp.appDomain}
      ))
    }
  }
}
