const retry = require('trytryagain')
const {expect} = require('chai')
const retryTimeout = require('../../retryTimeout')

module.exports = class PrNotifier {
  constructor ({
    prEventsListener,
    branch
  }) {
    this.prEventsListener = prEventsListener
    this.branch = branch
  }

  async waitForDeployStarted () {
    await retry(() => {
      const {branch, status} = this.prEventsListener.deploymentStatusEvents[0]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('pending')
    }, {timeout: retryTimeout})
  }

  async waitForDeployFinished () {
    await retry(() => {
      expect(this.prEventsListener.deploymentStatusEvents.length).to.eq(2)
    }, {timeout: retryTimeout})
  }

  async waitForDeploySuccessful () {
    await retry(() => {
      const {branch, status} = this.prEventsListener.deploymentStatusEvents[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('success')
    }, {timeout: retryTimeout})
  }

  async waitForDeployFailed () {
    await retry(() => {
      const {branch, status} = this.prEventsListener.deploymentStatusEvents[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('failure')
    }, {timeout: retryTimeout})
  }
}
