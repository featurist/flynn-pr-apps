const {expect} = require('chai')
const debug = require('debug')('pr-apps:test:flynnApiClientMemory')

module.exports = class FlynnApiClientMemory {
  constructor ({fakeFlynnApi}) {
    this.fakeFlynnApi = fakeFlynnApi
    this.clusterDomain = fakeFlynnApi.clusterDomain
    this.destroyAppRequests = []
    this.appNotCreated = true
    this.idSeq = 92
    Object.assign(this.fakeFlynnApi, {
      release: {env: {}},
      resources: [],
      providers: [],
      routes: []
    })
  }

  withExistingApp (appName, {env, resources = []} = {}) {
    this.fakeFlynnApi.app = {id: this.idSeq++, name: appName}

    const resourcesEnv = resources.reduce((result, resource) => {
      result[`${resource.toUpperCase()}_URL`] = `${resource}://stuff`
      return result
    }, {})
    Object.assign(this.fakeFlynnApi.release.env, resourcesEnv, env)

    this.fakeFlynnApi.appVersion = this.fakeFlynnApi.release.env.VERSION

    resources.forEach(resource => {
      const provider = {
        id: this.idSeq++,
        name: resource
      }
      this.fakeFlynnApi.providers.push(provider)
      this.fakeFlynnApi.resources.push({
        provider: provider.id,
        app_id: this.fakeFlynnApi.app.id
      })
    })
  }

  async getResources (appId) {
    debug(`Getting resources for appId %s'`, appId)
    return this.fakeFlynnApi.resources.filter(r => r.app_id === appId)
  }

  async getProvider (providerId) {
    debug(`Getting provider %s`, providerId)
    return this.fakeFlynnApi.providers.find(p => p.id === providerId)
  }

  async createAppResource ({appId, resourceName}) {
    debug(`Adding resource %s for appId %s`, resourceName, appId)
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    const provider = {
      id: this.idSeq++,
      name: resourceName
    }
    this.fakeFlynnApi.providers.push(provider)
    this.fakeFlynnApi.resources.push({
      provider: provider.id,
      app_id: this.fakeFlynnApi.app.id
    })
    return {
      env: {[`${resourceName.toUpperCase()}_URL`]: `${resourceName}://stuff`}
    }
  }

  async getRelease (appId) {
    debug(`Getting release for appId %s`, appId)
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    return this.fakeFlynnApi.release
  }

  async createRelease (release) {
    debug(`Creating release %j`, release)
    expect(release.app_id).to.eq(this.fakeFlynnApi.app.id)

    this.fakeFlynnApi.release = release
    this.fakeFlynnApi.release.id = this.idSeq++
    return this.fakeFlynnApi.release
  }

  async deployRelease (appId, releaseId) {
    debug(`Deploying release %s for appId %s`, releaseId, appId)
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    expect(releaseId).to.eq(this.fakeFlynnApi.release.id)
    // slugbuilder bump deploy does not set version
    if (this.fakeFlynnApi.release.env) {
      this.fakeFlynnApi.appVersion = this.fakeFlynnApi.release.env.VERSION
    }
  }

  async scaleAppProcesses ({appId, releaseId, scaleRequest}) {
    debug(`Scaling appId %s processes %o`, scaleRequest)
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    expect(releaseId).to.eq(this.fakeFlynnApi.release.id)
    this.fakeFlynnApi.scale = scaleRequest
  }

  async getAppRoutes (appId) {
    debug(`Getting appId %s routes`, appId)
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    return this.fakeFlynnApi.routes
  }

  async createAppRoute (appId, route) {
    debug('Creating appId %s route %o', appId, route)
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    this.fakeFlynnApi.routes.push(route)
  }

  async createApp (name) {
    this.fakeFlynnApi.app = {
      id: this.idSeq++,
      name
    }
    return this.fakeFlynnApi.app
  }

  async apps () {
    return [this.fakeFlynnApi.app]
  }

  async destroyApp (appId) {
    expect(appId).to.eq(this.fakeFlynnApi.app.id)
    this.fakeFlynnApi.app = 'destroyed'
  }
}
