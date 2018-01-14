const {struct} = require('superstruct')
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

module.exports = class PrApps {
  constructor ({
    codeHostingServiceApi,
    scmProject,
    flynnApiClient,
    configLoader
  }) {
    this.scmProject = scmProject
    this.codeHostingServiceApi = codeHostingServiceApi
    this.flynnService = new FlynnService(flynnApiClient)
    this.configLoader = configLoader
  }

  async deployPullRequest ({branch, prNumber}) {
    await this._deploy({branch, prNumber, newApp: true})
  }

  async deployUpdate ({branch, prNumber}) {
    await this._deploy({branch, prNumber, newApp: false})
  }

  async destroyPrApp (prNumber) {
    const appName = `pr-${prNumber}`
    await this.flynnService.destroyApp(appName)
  }

  async _deploy ({branch, prNumber, newApp}) {
    const appName = `pr-${prNumber}`

    await this.scmProject.clone(branch, async (localProject) => {
      const flynnApp = newApp
        ? await this.flynnService.createApp(appName)
        : await this.flynnService.getApp(appName)

      const deployment = await this.codeHostingServiceApi.createDeployment(branch)
      await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending', {
        flynnAppUrl: flynnApp.flynnUrl
      })

      let status = 'failure'
      try {
        const config = this._loadConfig(localProject.path, flynnApp)

        await flynnApp.withConfig(config, async () => {
          await localProject.push(flynnApp.gitUrl)
        })
        status = 'success'
      } finally {
        await this.codeHostingServiceApi.updateDeploymentStatus(deployment, status, {
          flynnAppUrl: flynnApp.flynnUrl,
          deployedAppUrl: flynnApp.webUrl
        })
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
