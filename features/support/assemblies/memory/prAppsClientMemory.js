const PrNotifier = require('./prNotifier')

module.exports = class PrAppsClientMemory {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  async openPullRequest (branch, prNumber) {
    try {
      await this.prApps.deployPullRequest({branch, prNumber})
    } catch (e) {
      console.error(e)
    }
    return new PrNotifier({
      codeHostingServiceApi: this.prApps.codeHostingServiceApi,
      branch
    })
  }

  async reopenPullRequest (branch, prNumber) {
    await this.prApps.deployPullRequest({branch, prNumber})
    return new PrNotifier({
      codeHostingServiceApi: this.prApps.codeHostingServiceApi,
      branch
    })
  }

  async pushMoreChanges (branch, prNumber) {
    await this.prApps.deployUpdate({branch, prNumber})
    return new PrNotifier({
      codeHostingServiceApi: this.prApps.codeHostingServiceApi,
      branch
    })
  }

  async closePullRequest (prNumber) {
    await this.prApps.destroyPrApp(prNumber)
  }

  async mergePullRequest (prNumber) {
    await this.prApps.destroyPrApp(prNumber)
  }
}
