module.exports = class FlynnServiceMemory {
  constructor (clusterDomain) {
    this.clusterDomain = clusterDomain
    this.destroyPrAppRequests = []
  }

  createApp (appName) {
    return this._makeApp(appName)
  }

  destroyApp (appName) {
    this.destroyPrAppRequests.push(appName)
  }

  getApp (appName) {
    return this._makeApp(appName)
  }

  _makeApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterDomain}`
    this.lastFlynnAppUrl = `https://dashboard.${this.clusterDomain}/apps/${appName}`
    return {
      webUrl: `https://${appName}.${this.clusterDomain}`,
      flynnUrl: this.lastFlynnAppUrl,
      appDomain: `${appName}.${this.clusterDomain}`,
      withConfig: ({env, routes} = {}) => {
        this.proposedEnv = env
        this.proposedRoutes = routes
      }
    }
  }
}
