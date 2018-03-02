const PrNotifier = require('./prNotifier')

module.exports = class PrAppsClientMemory {
  constructor ({prApps, fakeFlynnApi}) {
    this.prApps = prApps
    this.fakeFlynnApi = fakeFlynnApi
  }

  enable () {
    this.enabled = true
  }

  async openPullRequest (branch, prNumber, version) {
    if (this.enabled) {
      try {
        await this.prApps.deployPullRequest({branch, prNumber, version})
      } catch (e) {
        console.error(e)
      }
      return new PrNotifier({
        prEventsListener: this.prApps.codeHostingServiceApi,
        prNumber,
        fakeFlynnApi: this.fakeFlynnApi,
        branch
      })
    }
  }

  async reopenPullRequest (branch, prNumber, version) {
    if (this.enabled) {
      await this.prApps.deployPullRequest({branch, prNumber, version})
      return new PrNotifier({
        prEventsListener: this.prApps.codeHostingServiceApi,
        prNumber,
        fakeFlynnApi: this.fakeFlynnApi,
        branch
      })
    }
  }

  async pushMoreChanges (branch, prNumber, version) {
    if (this.enabled) {
      try {
        await this.prApps.deployUpdate({branch, prNumber, version})
      } catch (e) {
        console.error(e)
      }
      return new PrNotifier({
        prEventsListener: this.prApps.codeHostingServiceApi,
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
