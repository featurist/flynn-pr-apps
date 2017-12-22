const PrApps = require('../../../lib/prApps')
const {expect} = require('chai')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {}
  async stop () {}
  createActor () {
    this.flynnService = new FlynnServiceMemory('prs.example.com')
    this.codeHostingServiceApi = new MemoryCodeHostingServiceApi()
    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject: new ScmProjectMemory(),
      flynnService: this.flynnService
    })
    const codeHostingService = new MemoryCodeHostingService({prApps})
    return new MemoryActor({prApps, codeHostingService, flynnService: this.flynnService})
  }

  createGithubWebhooks () {
    this.codeHostingServiceApi.recordRequests = true
  }
}

class MemoryActor {
  constructor ({prApps, codeHostingService, flynnService}) {
    this.prApps = prApps
    this.flynnService = flynnService
    this.codeHostingService = codeHostingService
    this.currentBranch = 'Feature1'
    this.prNumber = 23
  }

  async start () {}
  async stop () {}

  async pushBranch () {}
  withExistingPrApp () {}
  withClosedPullRequest () {}

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch, this.prNumber)
  }

  async reopenPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.reopenPullRequest(this.currentBranch, this.prNumber)
  }

  async pushMoreChanges () {
    this.currentPrNotifier = await this.codeHostingService.pushMoreChanges(this.currentBranch, this.prNumber)
  }

  async closePullRequest () {
    await this.codeHostingService.closePullRequest(this.prNumber)
  }

  async mergePullRequest () {
    await this.codeHostingService.mergePullRequest(this.prNumber)
  }

  async shouldSeeDeployStarted () {
    this.currentPrNotifier.waitForDeployStarted()
  }

  async shouldSeeDeployFinished () {
    this.currentPrNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    this.currentPrNotifier.waitForDeploySuccessful()
  }

  async followDeployedAppLink () {
    const deployedAppUrl = this.flynnService.lastDeployedAppUrl
    expect(deployedAppUrl).to.eq(`https://pr-${this.prNumber}.prs.example.com`)
  }

  shouldSeeNewApp () {}
  shouldSeeUpdatedApp () {}
  shouldNotSeeApp () {
    expect(this.flynnService.destroyPrAppRequests).to.eql([`pr-${this.prNumber}`])
  }
}

class MemoryCodeHostingService {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  async openPullRequest (branch, prNumber) {
    await this.prApps.deployPullRequest({branch, prNumber})
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
    const {branch, status, deployedAppUrl} = this.codeHostingServiceApi.updateDeployStatusRequests[1]
    expect(branch).to.eq(this.branch)
    expect(status).to.eq('success')

    return deployedAppUrl
  }
}

class MemoryCodeHostingServiceApi {
  constructor () {
    this.updateDeployStatusRequests = []
  }

  async createDeployment (branch) {
    return {
      branch
    }
  }

  async updateDeploymentStatus (deployment, status, deployedAppUrl) {
    if (this.recordRequests) {
      this.updateDeployStatusRequests.push({
        branch: deployment.branch,
        status,
        deployedAppUrl
      })
    }
  }
}

class ScmProjectMemory {
  clone (branch, fn) {
    fn({
      push () {},
      remove () {}
    })
  }
}

class FlynnServiceMemory {
  constructor (clusterUrl) {
    this.clusterUrl = clusterUrl
    this.destroyPrAppRequests = []
  }

  createApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterUrl}`
    return {
      webUrl: this.lastDeployedAppUrl
    }
  }

  destroyApp (appName) {
    this.destroyPrAppRequests.push(appName)
  }

  getApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterUrl}`
    return {
      webUrl: `https://${appName}.${this.clusterUrl}`
    }
  }
}
