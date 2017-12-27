module.exports = class FlynnServiceMemory {
  constructor (clusterUrl) {
    this.clusterUrl = clusterUrl
    this.destroyPrAppRequests = []
  }

  createApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterUrl}`
    this.lastFlynnAppUrl = `https://dashboard.${this.clusterUrl}/apps/${appName}`
    return {
      webUrl: this.lastDeployedAppUrl,
      flynnUrl: this.lastFlynnAppUrl
    }
  }

  destroyApp (appName) {
    this.destroyPrAppRequests.push(appName)
  }

  getApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterUrl}`
    this.lastFlynnAppUrl = `https://dashboard.${this.clusterUrl}/apps/${appName}`
    return {
      webUrl: `https://${appName}.${this.clusterUrl}`,
      flynnUrl: this.lastFlynnAppUrl
    }
  }
}
