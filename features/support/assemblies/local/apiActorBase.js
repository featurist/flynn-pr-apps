const retry = require('trytryagain')
const {expect} = require('chai')
const HeadlessBrowser = require('../github/headlessBrowser')
const retryTimeout = require('../../retryTimeout')

module.exports = class ApiActorBase {
  constructor ({
    userLocalRepo,
    currentBranch,
    fakeFlynnApi
  }) {
    this.userLocalRepo = userLocalRepo
    this.currentBranch = currentBranch
    this.fakeFlynnApi = fakeFlynnApi
  }

  start () {}
  stop () {}

  async withExistingPrApp (config) {
    await this.pushBranch()
    await this.openPullRequest()
    await this.createPrApp(config)
    await this.followDeployedAppLink()
    await this.shouldSeeNewApp()
  }

  async withClosedPullRequest () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.closePullRequest()
  }

  async pushBranch () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<h1>Hello World!</h1>')
  }

  async createPrApp (config = {}) {
    const {gitUrl} = await this.fakeFlynnApi.createApp(`pr-${this.prNotifier.prNumber}`)
    if (config.resources) {
      this.fakeFlynnApi.addResources(config.resources)
    }
    if (config.env) {
      this.fakeFlynnApi.addEnv(config.env)
    }
    await this.userLocalRepo.pushCurrentBranchToFlynn(gitUrl)
  }

  async shouldSeeDeployStarted () {
    await this.prNotifier.waitForDeployStarted()
  }

  async shouldSeeDeployFinished () {
    await this.prNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    await this.prNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed () {
    await this.prNotifier.waitForDeployFailed()
  }

  async followDeployedAppLink () {
    const browser = new HeadlessBrowser()
    const deployedAppUrl = `https://pr-${this.prNotifier.prNumber}.${this.fakeFlynnApi.clusterDomain}`
    this.appIndexPageContent = await browser.visit(deployedAppUrl)
  }

  async shouldSeeNewApp () {
    expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1>')
  }

  async shouldSeeUpdatedApp () {
    expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1><p>This is Pr Apps</p>')
  }

  async shouldNotSeeApp () {
    await retry(async () => {
      await this.followDeployedAppLink()
      expect(this.appIndexPageContent).to.eq('Pr App Not Found')
    }, {timeout: retryTimeout, interval: 500})
  }
}
