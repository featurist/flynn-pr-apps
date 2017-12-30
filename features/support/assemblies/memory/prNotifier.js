const retry = require('trytryagain')
const {expect} = require('chai')

module.exports = class PrNotifier {
  constructor ({prEventsListener, branch, prNumber}) {
    this.prEventsListener = prEventsListener
    this.branch = branch
    this.prNumber = prNumber
  }

  async waitForDeployStarted () {
    await retry(() => {
      const {branch, status} = this.prEventsListener.deploymentStatusEvents[0]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('pending')
    }, {timeout: 5000})
  }

  async waitForDeployFinished () {
    await retry(() => {
      expect(this.prEventsListener.deploymentStatusEvents.length).to.eq(2)
    }, {timeout: 5000})
  }

  async waitForDeploySuccessful () {
    await retry(() => {
      const {branch, status} = this.prEventsListener.deploymentStatusEvents[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('success')
    }, {timeout: 5000})
  }

  async waitForDeployFailed () {
    await retry(() => {
      const {branch, status} = this.prEventsListener.deploymentStatusEvents[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('failure')
    }, {timeout: 5000})
  }
}
