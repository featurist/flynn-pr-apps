const retry = require('trytryagain')
const {expect} = require('chai')
const HeadlessBrowser = require('../github/headlessBrowser')

module.exports = class ApiActorBase {
  constructor ({
    userLocalRepo,
    currentBranch,
    flynnService
  }) {
    this.userLocalRepo = userLocalRepo
    this.currentBranch = currentBranch
    this.flynnService = flynnService
  }

  start () {}
  stop () {}

  async withExistingPrApp () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.createPrApp()
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

  async createPrApp () {
    const {gitUrl} = await this.flynnService.createApp(`pr-${this.prNotifier.prNumber}`)
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
    const deployedAppUrl = `https://pr-${this.prNotifier.prNumber}.${this.flynnService.clusterDomain}`
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
    }, {timeout: 10000, interval: 500})
  }
}
