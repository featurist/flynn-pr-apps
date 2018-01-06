module.exports = class FlynnServiceMemory {
  constructor (clusterDomain) {
    this.clusterDomain = clusterDomain
    this.destroyPrAppRequests = []
    this.appNotCreated = true
    this.proposedEnv = {}
    this.proposedResources = []
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

  setConfig ({env, resources = []} = {}) {
    const resourcesEnv = resources.reduce((result, resource) => {
      result[`${resource.toUpperCase()}_URL`] = `${resource}://stuff`
      return result
    }, {})
    Object.assign(this.proposedEnv, resourcesEnv, env)
    this.proposedResources = Array.from(new Set(this.proposedResources.concat(resources)))
  }

  _makeApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterDomain}`
    this.lastFlynnAppUrl = `https://dashboard.${this.clusterDomain}/apps/${appName}`
    return {
      webUrl: `https://${appName}.${this.clusterDomain}`,
      flynnUrl: this.lastFlynnAppUrl,
      appDomain: `${appName}.${this.clusterDomain}`,
      withConfig: ({env, routes, resources = []} = {}) => {
        this.proposedRoutes = Object.entries(routes || {}).reduce((result, [k, v]) => {
          result[`${appName}-${k}`] = v
          return result
        }, {})

        this.setConfig({env, resources})
      }
    }
  }
}
