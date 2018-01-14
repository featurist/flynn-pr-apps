const {expect} = require('chai')
const debug = require('debug')('pr-apps:test:flynnApiClientMemory')

module.exports = class FlynnApiClientMemory {
  constructor (clusterDomain) {
    this.clusterDomain = clusterDomain
    this.destroyAppRequests = []
    this.appNotCreated = true
    this.idSeq = 92
    this.release = {env: {}}
    this.resources = []
    this.providers = []
    this.routes = []
  }

  withExistingApp (appName, {env, resources = []} = {}) {
    this.app = {id: this.idSeq++, name: appName}

    const resourcesEnv = resources.reduce((result, resource) => {
      result[`${resource.toUpperCase()}_URL`] = `${resource}://stuff`
      return result
    }, {})
    Object.assign(this.release.env, resourcesEnv, env)

    resources.forEach(resource => {
      const provider = {
        id: this.idSeq++,
        name: resource
      }
      this.providers.push(provider)
      this.resources.push({
        provider: provider.id,
        app_id: this.app.id
      })
    })
  }

  async getResources (appId) {
    debug(`Getting resources for appId %s'`, appId)
    return this.resources.filter(r => r.app_id === appId)
  }

  async getProvider (providerId) {
    debug(`Getting provider %s`, providerId)
    return this.providers.find(p => p.id === providerId)
  }

  async createAppResource ({appId, resourceName}) {
    debug(`Adding resource %s for appId %s`, resourceName, appId)
    expect(appId).to.eq(this.app.id)
    const provider = {
      id: this.idSeq++,
      name: resourceName
    }
    this.providers.push(provider)
    this.resources.push({
      provider: provider.id,
      app_id: this.app.id
    })
    return {
      env: {[`${resourceName.toUpperCase()}_URL`]: `${resourceName}://stuff`}
    }
  }

  async getRelease (appId) {
    debug(`Getting release for appId %s`, appId)
    expect(appId).to.eq(this.app.id)
    return this.release
  }

  async createRelease (release) {
    debug(`Creating release %o`, release)
    expect(release.app_id).to.eq(this.app.id)

    this.release = release
    this.release.id = this.idSeq++
    return this.release
  }

  async deployRelease (appId, releaseId) {
    debug(`Deploying release %s for appId %s`, releaseId, appId)
    expect(appId).to.eq(this.app.id)
    expect(releaseId).to.eq(this.release.id)
  }

  async scaleAppProcesses ({appId, releaseId, scaleRequest}) {
    debug(`Scaling appId %s processes %o`, scaleRequest)
    expect(appId).to.eq(this.app.id)
    expect(releaseId).to.eq(this.release.id)
    this.scale = scaleRequest
  }

  async getAppRoutes (appId) {
    debug(`Getting appId %s routes`, appId)
    expect(appId).to.eq(this.app.id)
    return this.routes
  }

  async createAppRoute (appId, route) {
    debug('Creating appId %s route %o', appId, route)
    expect(appId).to.eq(this.app.id)
    this.routes.push(route)
  }

  async createApp (name) {
    this.app = {
      id: this.idSeq++,
      name
    }
    return this.app
  }

  async apps () {
    return [this.app]
  }

  async destroyApp (appId) {
    expect(appId).to.eq(this.app.id)
    this.app = 'destroyed'
  }
}
