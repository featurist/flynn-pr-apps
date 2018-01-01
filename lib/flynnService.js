const httpism = require('httpism')
const debug = require('debug')('pr-apps:flynnService')

// so that http client can request `https://` urls served by fake flynn api
// TODO is there a less global way?
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

class FlynnApp {
  constructor ({id, webUrl, gitUrl, flynnUrl, apiClient}) {
    this.id = id
    this.webUrl = webUrl
    this.gitUrl = gitUrl
    this.flynnUrl = flynnUrl
    this.apiClient = apiClient
  }

  async ensureConfig (config = {}) {
    debug('Ensuring %s app config %o', this.id, config)

    if (!config.env) return

    let release = {}
    try {
      release = await this.apiClient.get(`/apps/${this.id}/release`)
    } catch (e) {
      if (e.statusCode !== 404) {
        throw e
      }
    }

    if (release.env !== config.env) {
      release.env = config.env
      delete release.id
      const {id: newReleaseId} = await this.apiClient.post('/releases', release)
      await this.apiClient.post(`/apps/${this.id}/deploy`, {id: newReleaseId})
    }
  }
}

module.exports = class FlynnService {
  constructor ({clusterDomain, authKey}) {
    this.clusterDomain = clusterDomain
    this.authKey = authKey
    this.apiClient = httpism.client(`https://controller.${this.clusterDomain}`, {
      basicAuth: {
        username: '',
        password: authKey
      }
    })
  }

  async createApp (appName) {
    debug('Creating pr app %s', appName)

    const {id} = await this.apiClient.post('/apps', {name: appName})
    return new FlynnApp({
      id,
      webUrl: `https://${appName}.${this.clusterDomain}`,
      gitUrl: `https://:${this.authKey}@git.${this.clusterDomain}/${appName}.git`,
      flynnUrl: `https://dashboard.${this.clusterDomain}/apps/${id}`,
      apiClient: this.apiClient
    })
  }

  async destroyApp (appName) {
    debug('Destroying pr app %s', appName)

    const {id} = await this._findAppByName(appName)
    await this.apiClient.delete(`/apps/${id}`)
  }

  async getApp (appName) {
    const {id} = await this._findAppByName(appName)
    return new FlynnApp({
      id,
      webUrl: `https://${appName}.${this.clusterDomain}`,
      gitUrl: `https://:${this.authKey}@git.${this.clusterDomain}/${appName}.git`,
      flynnUrl: `https://dashboard.${this.clusterDomain}/apps/${id}`,
      apiClient: this.apiClient
    })
  }

  async _findAppByName (appName) {
    const apps = await this.apiClient.get('/apps')
    return apps.find(a => a.name === appName)
  }
}
