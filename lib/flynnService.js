const httpism = require('httpism')

// so that http client can request `https://` urls served by fake flynn api
// TODO is there a less global way?
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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
    await this.apiClient.post('/apps', {name: appName})
    return this.getApp(appName)
  }

  async destroyApp (appName) {
    const apps = await this.apiClient.get('/apps')
    const {id} = apps.find(a => a.name === appName)
    await this.apiClient.delete(`/apps/${id}`)
  }

  getApp (appName) {
    return {
      webUrl: `https://${appName}.${this.clusterDomain}`,
      gitUrl: `https://:${this.authKey}@git.${this.clusterDomain}/${appName}.git`
    }
  }
}
