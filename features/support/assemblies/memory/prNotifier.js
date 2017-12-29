const retry = require('trytryagain')
const {expect} = require('chai')

module.exports = class PrNotifier {
  constructor ({codeHostingServiceApi, branch}) {
    this.codeHostingServiceApi = codeHostingServiceApi
    this.branch = branch
  }

  async waitForDeployStarted () {
    await retry(() => {
      const {branch, status} = this.codeHostingServiceApi.updateDeployStatusRequests[0]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('pending')
    }, {timeout: 5000})
  }

  async waitForDeployFinished () {
    await retry(() => {
      expect(this.codeHostingServiceApi.updateDeployStatusRequests.length).to.eq(2)
    }, {timeout: 5000})
  }

  async waitForDeploySuccessful () {
    await retry(() => {
      const {branch, status} = this.codeHostingServiceApi.updateDeployStatusRequests[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('success')
    }, {timeout: 5000})
  }

  async waitForDeployFailed () {
    await retry(() => {
      const {branch, status} = this.codeHostingServiceApi.updateDeployStatusRequests[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('failure')
    }, {timeout: 5000})
  }
}
