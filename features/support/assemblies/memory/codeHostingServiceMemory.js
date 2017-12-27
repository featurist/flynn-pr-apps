const {expect} = require('chai')

class PrNotifier {
  constructor (codeHostingServiceApi, branch) {
    this.codeHostingServiceApi = codeHostingServiceApi
    this.branch = branch
  }

  waitForDeployStarted () {
    const {branch, status} = this.codeHostingServiceApi.updateDeployStatusRequests[0]
    expect(branch).to.eq(this.branch)
    expect(status).to.eq('pending')
  }

  waitForDeployFinished () {
    expect(this.codeHostingServiceApi.updateDeployStatusRequests.length).to.eq(2)
  }

  waitForDeploySuccessful () {
    const {branch, status} = this.codeHostingServiceApi.updateDeployStatusRequests[1]
    expect(branch).to.eq(this.branch)
    expect(status).to.eq('success')
  }

  waitForDeployFailed () {
    const {branch, status} = this.codeHostingServiceApi.updateDeployStatusRequests[1]
    expect(branch).to.eq(this.branch)
    expect(status).to.eq('failure')
  }
}

module.exports = class MemoryCodeHostingService {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  async openPullRequest (branch, prNumber) {
    try {
      await this.prApps.deployPullRequest({branch, prNumber})
    } catch (e) {
      console.error(e)
    }
    return new PrNotifier(this.prApps.codeHostingServiceApi, branch)
  }

  async reopenPullRequest (branch, prNumber) {
    await this.prApps.deployPullRequest({branch, prNumber})
    return new PrNotifier(this.prApps.codeHostingServiceApi, branch)
  }

  async pushMoreChanges (branch, prNumber) {
    await this.prApps.deployUpdate({branch, prNumber})
    return new PrNotifier(this.prApps.codeHostingServiceApi, branch)
  }

  async closePullRequest (prNumber) {
    await this.prApps.destroyPrApp(prNumber)
  }

  async mergePullRequest (prNumber) {
    await this.prApps.destroyPrApp(prNumber)
  }
}
