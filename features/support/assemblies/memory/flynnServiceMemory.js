module.exports = class FlynnServiceMemory {
  constructor (clusterDomain) {
    this.clusterDomain = clusterDomain
    this.destroyPrAppRequests = []
    this.appNotCreated = true
  }

  createApp (appName) {
    delete this.appNotCreated
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
      withConfig: ({env, routes, resources = []} = {}) => {
        const resourcesEnv = resources.reduce((result, resource) => {
          result[`${resource.toUpperCase()}_URL`] = `${resource}://stuff`
          return result
        }, {})
        this.proposedEnv = Object.assign({}, resourcesEnv, env)
        this.proposedRoutes = routes
        this.proposedResources = resources
      }
    }
  }
}
