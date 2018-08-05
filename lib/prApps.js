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
    workQueue,
    appInfo,
    deploymentRepo,
    configLoader,
    contextDebug
  }) {
    this.scmProject = scmProject
    this.codeHostingServiceApi = codeHostingServiceApi
    this.deploymentRepo = deploymentRepo
    this.configLoader = configLoader
    this.workQueue = workQueue

    const {clusterDomain, prAppsDomain} = loadFlynnInfo(appInfo)
    const flynnApiClient = flynnApiClientFactory(clusterDomain)
    this.flynnService = new FlynnService(flynnApiClient, contextDebug)
    this.prAppsDomain = prAppsDomain
  }

  async deployPullRequest ({branch, prNumber}) {
    await this._deploy({branch, prNumber, isNewApp: true})
  }

  async deployUpdate ({branch, prNumber}) {
    const deployment = await this._deploy({branch, prNumber, isNewApp: false})
    return deployment
  }

  async destroyPrApp (prNumber) {
    const appName = `pr-${prNumber}`
    await this.deploymentRepo.deleteAppDeployments(prNumber)
    await this.flynnService.destroyApp(appName)
  }

  async getDeployment (id) {
    const deployment = await this.deploymentRepo.get(id)
    return deployment
  }

  async _deploy ({branch, prNumber, isNewApp}) {
    const appName = `pr-${prNumber}`
    const flynnApp = isNewApp
      ? await this.flynnService.createApp(appName)
      : await this.flynnService.getApp(appName)

    const pendingDeployment = await this.deploymentRepo.findPending(prNumber)

    if (pendingDeployment) {
      this.workQueue.addTask(() => this._deploy(...arguments), {delayed: true})
      return
    }

    const deployment = await this.deploymentRepo.create({
      prNumber,
      branch,
      flynnAppUrl: flynnApp.flynnUrl,
      status: 'pending'
    })

    this.workQueue.addTask(this._deploymentTask({deployment, flynnApp}))
    return deployment
  }

  _deploymentTask ({deployment, flynnApp}) {
    return async () => {
      const codeHostingServiceDeployment = await this.codeHostingServiceApi.createDeployment(deployment.branch)
      const deploymentUrl = `https://${this.prAppsDomain}/deployments/${deployment.id}`

      try {
        await this.scmProject.clone(deployment.branch, async (localProject) => {
          deployment.version = localProject.remoteVersion
          await this.deploymentRepo.save(deployment)

          const config = this._loadConfig(localProject.path, flynnApp)

          await this.codeHostingServiceApi.updateDeploymentStatus(
            codeHostingServiceDeployment,
            Object.assign({deploymentUrl}, deployment)
          )

          await flynnApp.withConfig({config}, async () => {
            const logCollector = new Writable({
              write: async (chunk, encoding, next) => {
                const lines = chunk.toString().split('\n')
                for (let line of lines) {
                  await this.deploymentRepo.appendLog(deployment, line)
                }
                next()
              }
            })

            await localProject.push(flynnApp.gitUrl, logCollector)
          })
          deployment.status = 'success'
          deployment.deployedAppUrl = flynnApp.webUrl
        })
      } catch (e) {
        await this.deploymentRepo.appendLog(deployment, e.toString())
        deployment.status = 'failure'
        throw e
      } finally {
        await this.deploymentRepo.save(deployment)
        await this.codeHostingServiceApi.updateDeploymentStatus(
          codeHostingServiceDeployment,
          Object.assign({deploymentUrl}, deployment)
        )
      }
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
