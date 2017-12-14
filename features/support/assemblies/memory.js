const PrApps = require('../../../lib/prApps')
const {expect} = require('chai')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {}
  async stop () {}
  createActor () {
    const prApps = new PrApps({
      codeHostingServiceApi: new MemoryCodeHostingServiceApi(),
      scmProject: new ScmProjectMemory(),
      flynnService: new FlynnServiceMemory('prs.example.com')
    })
    const codeHostingService = new MemoryCodeHostingService({prApps})
    return new MemoryActor({prApps, codeHostingService})
  }
}

class MemoryActor {
  constructor ({prApps, codeHostingService}) {
    this.prApps = prApps
    this.codeHostingService = codeHostingService
  }

  async start () {}
  async stop () {}

  async pushBranch () {}

  async openPullRequest () {
    this.currentBranch = 'Feature1'
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
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
    const deployedAppUrl = this.prApps.flynnService.lastDeployedAppUrl
    expect(deployedAppUrl).to.eq(`https://pr-${this.currentPrNotifier.prNumber}.prs.example.com`)
  }

  async shouldSeeDeployedApp () {}
}

class MemoryCodeHostingService {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  async openPullRequest (branch) {
    this.prNumber = 23
    await this.prApps.deployPullRequest({branch, prNumber: this.prNumber})
    return new PrNotifier(this.prApps.codeHostingServiceApi, branch, this.prNumber)
  }
}

class PrNotifier {
  constructor (codeHostingServiceApi, branch, prNumber) {
    this.codeHostingServiceApi = codeHostingServiceApi
    this.branch = branch
    this.prNumber = prNumber
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
    this.updateDeployStatusRequests.push({
      branch: deployment.branch,
      status,
      deployedAppUrl
    })
  }
}

class ScmProjectMemory {
  async clone () {
    return {
      push () {},
      remove () {}
    }
  }
}

class FlynnServiceMemory {
  constructor (clusterUrl) {
    this.clusterUrl = clusterUrl
  }

  async createApp (appName) {
    this.lastDeployedAppUrl = `https://${appName}.${this.clusterUrl}`
    return {
      webUrl: this.lastDeployedAppUrl
    }
  }
}
