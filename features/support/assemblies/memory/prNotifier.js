const retry = require('trytryagain')
const {expect} = require('chai')
const retryTimeout = require('../../retryTimeout')

module.exports = class PrNotifier {
  constructor ({prEventsListener, branch, prNumber, fakeFlynnApi, checkUrls = true}) {
    this.prEventsListener = prEventsListener
    this.branch = branch
    this.prNumber = prNumber
    this.fakeFlynnApi = fakeFlynnApi
    this.checkUrls = checkUrls
  }

  async waitForDeployStarted () {
    await retry(() => {
      const {branch, status, flynnAppUrl} = this.prEventsListener.deploymentStatusEvents[0]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('pending')
      if (this.checkUrls) {
        expect(flynnAppUrl).to.eq(`https://dashboard.${this.fakeFlynnApi.clusterDomain}/apps/${this.fakeFlynnApi.app.id}`)
      }
    }, {timeout: retryTimeout})
  }

  async waitForDeployFinished () {
    await retry(() => {
      expect(this.prEventsListener.deploymentStatusEvents.length).to.eq(2)
    }, {timeout: retryTimeout})
  }

  async waitForDeploySuccessful () {
    await retry(() => {
      const {branch, status, deployedAppUrl} = this.prEventsListener.deploymentStatusEvents[1]
      expect(branch).to.eq(this.branch)
      expect(status).to.eq('success')
      if (this.checkUrls) {
        expect(deployedAppUrl).to.eq(`https://pr-${this.prNumber}.${this.fakeFlynnApi.clusterDomain}`)
      }
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
