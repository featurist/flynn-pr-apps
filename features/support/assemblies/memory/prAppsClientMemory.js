const PrNotifier = require('./prNotifier')

module.exports = class PrAppsClientMemory {
  constructor ({prApps, fakeFlynnApi, deploymentStatusEvents}) {
    this.prApps = prApps
    this.fakeFlynnApi = fakeFlynnApi
    this.deploymentStatusEvents = deploymentStatusEvents
  }

  enable () {
    this.enabled = true
  }

  async redeploy ({branch, prNumber}) {
    await this.prApps.deployUpdate({branch, prNumber})
    return new PrNotifier({
      deploymentStatusEvents: this.deploymentStatusEvents,
      prNumber,
      fakeFlynnApi: this.fakeFlynnApi,
      branch
    })
  }

  async openPullRequest (branch, prNumber) {
    if (this.enabled) {
      try {
        await this.prApps.deployPullRequest({branch, prNumber})
      } catch (e) {
        console.error(e)
      }
      return new PrNotifier({
        deploymentStatusEvents: this.deploymentStatusEvents,
        prNumber,
        fakeFlynnApi: this.fakeFlynnApi,
        branch
      })
    }
  }

  async reopenPullRequest (branch, prNumber) {
    if (this.enabled) {
      await this.prApps.deployPullRequest({branch, prNumber})
      return new PrNotifier({
        deploymentStatusEvents: this.deploymentStatusEvents,
        prNumber,
        fakeFlynnApi: this.fakeFlynnApi,
        branch
      })
    }
  }

  async pushMoreChanges (branch, prNumber) {
    if (this.enabled) {
      try {
        await this.prApps.deployUpdate({branch, prNumber})
      } catch (e) {
        console.error(e)
      }
      return new PrNotifier({
        deploymentStatusEvents: this.deploymentStatusEvents,
        prNumber,
        fakeFlynnApi: this.fakeFlynnApi,
        branch
      })
    }
  }

  async closePullRequest (prNumber) {
    if (this.enabled) {
      await this.prApps.destroyPrApp(prNumber)
    }
  }

  async mergePullRequest (prNumber) {
    if (this.enabled) {
      await this.prApps.destroyPrApp(prNumber)
    }
  }

  async getDeployment (id) {
    const deployment = await this.prApps.getDeployment(id)
    return deployment
  }
}
