const {expect} = require('chai')
const debug = require('debug')('pr-apps:test:flynnApiClientMemory')
const FlynnApp = require('./flynnApp')
const clone = require('../../../../lib/clone')

let idSeq = 92

module.exports = class FlynnApiClientMemory {
  constructor ({fakeFlynnApi}) {
    this.fakeFlynnApi = fakeFlynnApi
  }

  withExistingApp (name, {env, resources = []} = {}) {
    const app = new FlynnApp({name})
    this.fakeFlynnApi.apps.add(app)

    const resourcesEnv = resources.reduce((result, resource) => {
      result[`${resource.toUpperCase()}_URL`] = `${resource}://stuff`
      return result
    }, {})
    Object.assign(app.release.env, resourcesEnv, env)

    app.appVersion = app.release.env.VERSION

    resources.forEach(resource => {
      const provider = {
        id: idSeq++,
        name: resource
      }
      this.fakeFlynnApi.providers.push(provider)
      app.resources.push({
        provider: provider.id,
        app_id: app.id
      })
    })
  }

  async getResources (appId) {
    debug(`Getting resources for appId %s'`, appId)
    const app = this._getApp(appId)
    return app.resources
  }

  async getProvider (providerId) {
    debug(`Getting provider %s`, providerId)
    return this.fakeFlynnApi.providers.find(p => p.id === providerId)
  }

  async createAppResource ({appId, resourceName}) {
    debug(`Adding resource %s for appId %s`, resourceName, appId)
    const app = this._getApp(appId)
    const provider = {
      id: idSeq++,
      name: resourceName
    }
    this.fakeFlynnApi.providers.push(provider)
    app.resources.push({
      provider: provider.id,
      app_id: appId
    })
    return {
      env: {[`${resourceName.toUpperCase()}_URL`]: `${resourceName}://stuff`}
    }
  }

  async getRelease (appId) {
    debug(`Getting release for appId %s`, appId)
    const app = this._getApp(appId)
    return app.release
  }

  async createRelease (release) {
    debug(`Creating release %j`, release)
    const app = this._getApp(release.app_id)

    app.release = release
    app.release.id = idSeq++
    return app.release
  }

  async deployRelease (appId, releaseId) {
    debug(`Deploying release %s for appId %s`, releaseId, appId)
    const app = this._getApp(appId)
    expect(releaseId).to.eq(app.release.id)

    app.deploys.push({
      release: clone(app.release)
    })

    // slugbuilder release does not have env
    if (app.release.env) {
      app.appVersion = app.release.env.VERSION
    }
  }

  async scaleAppProcesses ({appId, releaseId, scaleRequest}) {
    debug(`Scaling appId %s processes %o`, appId, scaleRequest)
    const app = this._getApp(appId)
    expect(releaseId).to.eq(app.release.id)
    app.scale = scaleRequest
  }

  async getAppRoutes (appId) {
    debug(`Getting appId %s routes`, appId)
    const app = this._getApp(appId)
    return app.routes
  }

  async createAppRoute (appId, route) {
    debug('Creating appId %s route %o', appId, route)
    const app = this._getApp(appId)
    app.routes.push(route)
  }

  async createApp (name) {
    const app = new FlynnApp({name})
    this.fakeFlynnApi.apps.add(app)
    return app
  }

  apps () {
    return Array.from(this.fakeFlynnApi.apps)
  }

  async destroyApp (appId) {
    const app = this._getApp(appId)
    this.fakeFlynnApi.apps.delete(app)
  }

  findAppByName (appName) {
    return Array.from(this.apps).find(({name}) => name === appName)
  }

  _getApp (appId) {
    return this.apps().find(({id}) => id === appId)
  }
}
