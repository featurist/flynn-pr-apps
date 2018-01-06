const httpism = require('httpism')
const debug = require('debug')('pr-apps:flynnService')

// so that http client can request `https://` urls served by fake flynn api
// TODO is there a less global way?
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

class FlynnApp {
  constructor ({id, appName, clusterDomain, authKey, apiClient}) {
    this.id = id
    this.appName = appName
    this.appDomain = `${appName}.${clusterDomain}`
    this.webUrl = `https://${this.appDomain}`
    this.gitUrl = `https://:${authKey}@git.${clusterDomain}/${appName}.git`
    this.flynnUrl = `https://dashboard.${clusterDomain}/apps/${id}`
    this.apiClient = apiClient
  }

  async withConfig (config = {}, deployFn) {
    debug('Applying config %o for appId %s', config, this.id)

    let resourcesEnv
    if (config.resources) {
      resourcesEnv = await this._ensureResources(config.resources)
    }

    if (resourcesEnv || config.env) {
      const allEnv = Object.assign({}, resourcesEnv, config.env)
      await this._ensureEnv(allEnv)
    }

    if (config.routes) {
      await this._ensureRoutes(config.routes)
    }

    await deployFn()

    if (config.routes) {
      await this._ensureScale(Object.keys(config.routes))
    }
  }

  async _ensureResources (resources) {
    const existingResources = await this.apiClient.get(`/apps/${this.id}/resources`)
    const existingResourceNames = await Promise.all(
      existingResources.map(async ({provider}) => {
        const {name} = await this.apiClient.get(`/providers/${provider}`)
        return name
      })
    )

    const newResources = (await Promise.all(
      resources.map(name => {
        if (existingResourceNames.find(r => r === name)) {
          debug('Skipping resource %s', name)
        } else {
          debug('Adding resource %s', name)
          return this.apiClient.post(`/providers/${name}/resources`, {
            apps: [this.id]
          })
        }
      })
    )).filter(_ => _)

    return newResources.reduce((result, {env}) => {
      Object.assign(result, env)
      return result
    }, {})
  }

  async _ensureScale (procs) {
    const {id: newReleaseId} = await this.apiClient.get(`/apps/${this.id}/release`)
    const scaleRequest = {
      state: 'pending',
      new_processes: Object.assign(
        {web: 1},
        procs.reduce((result, proc) => {
          result[proc] = 1
          return result
        }, {})
      )
    }
    debug('Ensuring scale %o', scaleRequest.new_processes)
    await this.apiClient.put(`/apps/${this.id}/scale/${newReleaseId}`, scaleRequest)
  }

  async _ensureRoutes (routes) {
    const routesToAdd = Object.entries(routes).reduce((result, [key, value]) => {
      result[`${this.appName}-${key}`] = value
      return result
    }, {})
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
        debug('Creating route %o', body)
        return this.apiClient.post(`/apps/${this.id}/routes`, body)
      })
    ])
    return Object.keys(routesToAdd).map(r => {
      return r.replace(`${this.appName}-`, '')
    })
  }

  async _ensureEnv (env) {
    let release = {}
    try {
      release = await this.apiClient.get(`/apps/${this.id}/release`)
    } catch (e) {
      if (e.statusCode !== 404) {
        throw e
      }
    }

    if (release.env !== env) {
      debug('Setting env %o', env)

      delete release.id
      release.env = env
      release.app_id = this.id

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
    debug('Getting pr app %s', appName)
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
    debug('Existing apps %o', apps.map(a => a.name))
    return apps.find(a => a.name === appName)
  }
}
