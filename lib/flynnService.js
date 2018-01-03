const mapObject = require('lowscore/mapObject')
const httpism = require('httpism')
const debug = require('debug')('pr-apps:flynnService')
const clone = require('./clone')

// so that http client can request `https://` urls served by fake flynn api
// TODO is there a less global way?
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

class FlynnApp {
  constructor ({id, appName, clusterDomain, authKey, apiClient}) {
    this.id = id
    this.appDomain = `${appName}.${clusterDomain}`
    this.webUrl = `https://${this.appDomain}`
    this.gitUrl = `https://:${authKey}@git.${clusterDomain}/${appName}.git`
    this.flynnUrl = `https://dashboard.${clusterDomain}/apps/${id}`
    this.apiClient = apiClient
  }

  async withConfig (config = {}, deployFn) {
    debug('Applying config %o for appId %s', config, this.id)

    if (config.env) {
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

    let routesToAdd = {}
    if (config.routes) {
      routesToAdd = clone(config.routes)
      const existingRoutes = await this.apiClient.get(`/apps/${this.id}/routes`)
      existingRoutes.forEach(({service}) => {
        delete routesToAdd[service]
      })
      await Promise.all([
        Object.entries(routesToAdd).map(([service, domain]) => {
          const body = {
            type: 'http',
            service,
            domain
          }
          return this.apiClient.post(`/apps/${this.id}/routes`, body)
        })
      ])
    }

    await deployFn()

    if (Object.keys(routesToAdd).length) {
      const {id: newReleaseId} = await this.apiClient.get(`/apps/${this.id}/release`)
      const scaleRequest = {
        state: 'pending',
        new_processes: Object.assign(
          {web: 1},
          mapObject(routesToAdd, () => 1)
        )
      }
      await this.apiClient.put(`/apps/${this.id}/scale/${newReleaseId}`, scaleRequest)
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
      appName,
      clusterDomain: this.clusterDomain,
      authKey: this.authKey,
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
      appName,
      clusterDomain: this.clusterDomain,
      authKey: this.authKey,
      apiClient: this.apiClient
    })
  }

  async _findAppByName (appName) {
    const apps = await this.apiClient.get('/apps')
    return apps.find(a => a.name === appName)
  }
}
