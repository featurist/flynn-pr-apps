class FlynnApp {
  constructor ({id, appName, apiClient, debug}) {
    this.id = id
    this.appName = appName
    this.appDomain = `${appName}.${apiClient.clusterDomain}`
    this.webUrl = `https://${this.appDomain}`
    this.gitUrl = `https://:${apiClient.authKey}@git.${apiClient.clusterDomain}/${appName}.git`
    this.flynnUrl = `https://dashboard.${apiClient.clusterDomain}/apps/${id}`
    this.apiClient = apiClient
    this.debug = debug
  }

  async withConfig ({config = {}}, deployFn) {
    this.debug('Applying config %o for appId %s', config, this.id)

    let resourcesEnv = {}
    if (config.resources) {
      resourcesEnv = await this._ensureResources(config.resources)
    }

    const env = {}
    Object.assign(env, resourcesEnv, config.env)
    await this._ensureEnv(env)

    if (config.routes) {
      await this._ensureRoutes(config.routes)
    }

    await deployFn()

    await this._ensureEnv(env)

    if (config.routes) {
      await this._ensureScale(Object.keys(config.routes))
    }
  }

  async _ensureResources (resources) {
    const existingResources = await this.apiClient.getResources(this.id)
    const existingResourceNames = await Promise.all(
      existingResources.map(async ({provider}) => {
        const {name} = await this.apiClient.getProvider(provider)
        return name
      })
    )

    const newResources = (await Promise.all(
      resources.map(name => {
        if (existingResourceNames.find(r => r === name)) {
          this.debug('Skipping resource %s', name)
        } else {
          this.debug('Adding resource %s', name)
          return this.apiClient.createAppResource({appId: this.id, resourceName: name})
        }
      })
    )).filter(_ => _)

    return existingResources.concat(newResources).reduce((result, {env}) => {
      Object.assign(result, env)
      return result
    }, {})
  }

  async _ensureScale (procs) {
    const {id: releaseId} = await this.apiClient.getRelease(this.id)
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
    await this.apiClient.scaleAppProcesses({
      appId: this.id,
      releaseId,
      scaleRequest
    })
  }

  async _ensureRoutes (routes) {
    const routesToAdd = Object.entries(routes).reduce((result, [key, value]) => {
      result[`${this.appName}-${key}`] = value
      return result
    }, {})
    const existingRoutes = await this.apiClient.getAppRoutes(this.id)

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
        return this.apiClient.createAppRoute(this.id, body)
      })
    ])
    return Object.keys(routesToAdd).map(r => {
      return r.replace(`${this.appName}-`, '')
    })
  }

  async _getLastRelease () {
    let release = {}
    try {
      release = await this.apiClient.getRelease(this.id)
    } catch (e) {
      if (e.statusCode !== 404) {
        throw e
      }
    }
    return release
  }

  async _ensureEnv (env) {
    const release = await this._getLastRelease()

    this.debug('Setting env %o', env)

    delete release.id
    release.env = Object.assign({}, release.env, env)
    release.app_id = this.id

    const {id: newReleaseId} = await this.apiClient.createRelease(release)
    await this.apiClient.deployRelease(this.id, newReleaseId)
  }
}

module.exports = class FlynnService {
  constructor (apiClient, contextDebug = require('debug')) {
    this.apiClient = apiClient
    this.debug = contextDebug('pr-apps:flynnService')
  }

  async createApp (appName) {
    this.debug('Creating pr app %s', appName)

    const {id} = await this.apiClient.createApp(appName)

    const gb = 1024 * 1024 * 1024

    const initRelease = {
      app_id: id,
      processes: {
        slugbuilder: {
          resources: {
            temp_disk: {
              limit: gb
            },
            memory: {
              limit: 2 * gb
            }
          }
        }
      }
    }
    const {id: newReleaseId} = await this.apiClient.createRelease(initRelease)
    await this.apiClient.deployRelease(id, newReleaseId)

    return new FlynnApp({
      id,
      appName,
      apiClient: this.apiClient,
      debug: this.debug
    })
  }

  async destroyApp (appName) {
    this.debug('Destroying pr app %s', appName)

    const {id} = await this._findAppByName(appName)
    await this.apiClient.destroyApp(id)
  }

  async getApp (appName) {
    this.debug('Getting pr app %s', appName)
    const {id} = await this._findAppByName(appName)
    return new FlynnApp({
      id,
      appName,
      apiClient: this.apiClient,
      debug: this.debug
    })
  }

  async _findAppByName (appName) {
    const apps = await this.apiClient.apps()
    this.debug('Existing apps %o', apps.map(a => a.name))
    return apps.find(a => a.name === appName)
  }
}
