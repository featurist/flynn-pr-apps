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
    await this._deploy({branch, prNumber, version, isNewApp: true})
  }

  async deployUpdate ({branch, prNumber, version}) {
    await this._deploy({branch, prNumber, version, isNewApp: false})
  }

  async destroyPrApp (prNumber) {
    const appName = `pr-${prNumber}`
    await this.deploymentRepo.deleteAppDeployments(appName)
    await this.flynnService.destroyApp(appName)
  }

  async getDeployment (id) {
    const deployment = await this.deploymentRepo.get(id)
    return deployment
  }

  async _deploy ({branch, prNumber, isNewApp, version}) {
    const appName = `pr-${prNumber}`

    const codeHostingServiceDeployment = await this.codeHostingServiceApi.createDeployment(branch)
    const deployment = await this.deploymentRepo.create({
      appName,
      status: 'pending'
    })
    const deploymentUrl = `https://${this.prAppsDomain}/deployments/${deployment.id}`

    try {
      await this.scmProject.clone(branch, async (localProject) => {
        const flynnApp = isNewApp
          ? await this.flynnService.createApp(appName)
          : await this.flynnService.getApp(appName)

        deployment.flynnAppUrl = flynnApp.flynnUrl

        const config = this._loadConfig(localProject.path, flynnApp)

        await this.codeHostingServiceApi.updateDeploymentStatus(
          codeHostingServiceDeployment,
          Object.assign({deploymentUrl}, deployment)
        )

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
      })
    } catch (e) {
      this.deploymentRepo.appendLog(deployment, e.toString())
      deployment.status = 'failure'
      throw e
    } finally {
      await Promise.all([
        this.deploymentRepo.save(deployment),
        this.codeHostingServiceApi.updateDeploymentStatus(
          codeHostingServiceDeployment,
          Object.assign({deploymentUrl}, deployment)
        )
      ])
    }
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
