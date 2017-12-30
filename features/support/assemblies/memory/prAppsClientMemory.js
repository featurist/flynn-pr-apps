const PrNotifier = require('./prNotifier')

module.exports = class PrAppsClientMemory {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  enable () {
    this.enabled = true
  }

  async openPullRequest (branch, prNumber) {
    if (this.enabled) {
      try {
        await this.prApps.deployPullRequest({branch, prNumber})
      } catch (e) {
        console.error(e)
      }
      return new PrNotifier({
        prEventsListener: this.prApps.codeHostingServiceApi,
        prNumber,
        branch
      })
    }
  }

  async reopenPullRequest (branch, prNumber) {
    if (this.enabled) {
      await this.prApps.deployPullRequest({branch, prNumber})
      return new PrNotifier({
        prEventsListener: this.prApps.codeHostingServiceApi,
        prNumber,
        branch
      })
    }
  }

  async pushMoreChanges (branch, prNumber) {
    if (this.enabled) {
      await this.prApps.deployUpdate({branch, prNumber})
      return new PrNotifier({
        prEventsListener: this.prApps.codeHostingServiceApi,
        prNumber,
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
}
