module.exports = class FlynnServiceMemory {
  constructor (clusterUrl) {
    this.clusterUrl = clusterUrl
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
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterUrl}`
    this.lastFlynnAppUrl = `https://dashboard.${this.clusterUrl}/apps/${appName}`
    return {
      webUrl: `https://${appName}.${this.clusterUrl}`,
      flynnUrl: this.lastFlynnAppUrl,
      ensureConfig: ({env} = {}) => {
        this.proposedConfig = {env}
      }
    }
  }
}
