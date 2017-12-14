const httpism = require('httpism')

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
    return {
      webUrl: `https://${appName}.${this.clusterDomain}`,
      gitUrl: `https://:${this.authKey}@git.${this.clusterDomain}/${appName}.git`
    }
  }
}
