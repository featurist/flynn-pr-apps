const {expect} = require('chai')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FlynnServiceMemory = require('./flynnServiceMemory')
const CodeHostingServiceApiMemory = require('./codeHostingServiceApiMemory')
const CodeHostingServiceMemory = require('./codeHostingServiceMemory')
const GitMemory = require('./gitMemory')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {
    this.fakeFlynnApi = {
      failNextDeploy () {
        this.nextDeployShouldFail = true
      }
    }
  }
  async stop () {}

  createActor () {
    this.flynnService = new FlynnServiceMemory('prs.example.com')
    this.codeHostingServiceApi = new CodeHostingServiceApiMemory()
    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject: new GitProject({
        token: 'secret',
        repo: 'https://github.com/asdfsd/bbbb.git',
        git: new GitMemory(this.fakeFlynnApi)
      }),
      flynnService: this.flynnService
    })
    const codeHostingService = new CodeHostingServiceMemory({prApps})
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
    const lastFlynnAppUrl = this.flynnService.lastFlynnAppUrl
    expect(lastFlynnAppUrl).to.eq(`https://dashboard.prs.example.com/apps/pr-${this.prNumber}`)
  }

  async shouldSeeDeployFinished () {
    this.currentPrNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    this.currentPrNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed () {
    this.currentPrNotifier.waitForDeployFailed()
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
