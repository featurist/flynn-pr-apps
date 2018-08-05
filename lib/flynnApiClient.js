const httpism = require('httpism')

// disable certificate validation because flynn is using self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

module.exports = class FlynnApiClient {
  constructor ({clusterDomain, authKey, contextDebug = require('debug')}) {
    this.authKey = authKey
    this.clusterDomain = clusterDomain
    this.api = httpism.client(`https://controller.${this.clusterDomain}`, {
      basicAuth: {
        username: '',
        password: authKey
      }
    })
    this.debug = contextDebug('pr-apps:flynnApiClient')
  }

  async getResources (appId) {
    this.debug(`Getting resources for appId %s'`, appId)
    const resources = await this.api.get(`/apps/${appId}/resources`)
    return resources
  }

  async getProvider (providerId) {
    this.debug(`Getting provider %s`, providerId)
    const provider = await this.api.get(`/providers/${providerId}`)
    return provider
  }

  async createAppResource ({appId, resourceName}) {
    this.debug(`Adding resource %s for appId %s`, resourceName, appId)
    const newResource = this.api.post(`/providers/${resourceName}/resources`, {
      apps: [appId]
    })
    return newResource
  }

  async getRelease (appId) {
    this.debug(`Getting release for appId %s`, appId)
    const release = await this.api.get(`/apps/${appId}/release`)
    return release
  }

  async createRelease (release) {
    this.debug(`Creating release %j`, release)
    const newRelease = await this.api.post('/releases', release)
    return newRelease
  }

  async deployRelease (appId, releaseId) {
    this.debug(`Deploying release %s for appId %s`, releaseId, appId)
    await this.api.post(`/apps/${appId}/deploy`, {id: releaseId})
  }

  async scaleAppProcesses ({appId, releaseId, scaleRequest}) {
    this.debug(`Scaling appId %s processes %O`, appId, scaleRequest)
    await this.api.put(`/apps/${appId}/scale/${releaseId}`, scaleRequest)
  }

  async getAppRoutes (appId) {
    this.debug(`Getting appId %s routes`, appId)
    const routes = await this.api.get(`/apps/${appId}/routes`)
    return routes
  }

  async createAppRoute (appId, route) {
    this.debug('Creating appId %s route %o', appId, route)
    await this.api.post(`/apps/${appId}/routes`, route)
  }

  async createApp (name) {
    const app = await this.api.post('/apps', {name})
    return app
  }

  async apps () {
    const apps = await this.api.get('/apps')
    return apps
  }

  async destroyApp (appId) {
    await this.api.delete(`/apps/${appId}`)
  }
}
