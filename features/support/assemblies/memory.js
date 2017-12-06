const PrApps = require('../../../lib/prApps')
const {expect} = require('chai')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {}
  async stop () {}
  createActor () {
    const prApps = new PrApps({
      codeHostingServiceApi: new MemoryCodeHostingServiceApi()
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
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async shouldSeeDeployStarted () {
    this.currentPrNotifier.waitForDeployStarted()
  }
}

class MemoryCodeHostingService {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  async openPullRequest (branch) {
    await this.prApps.deployPullRequest(branch)
    return {
      waitForDeployStarted: () => {
        expect(this.prApps.codeHostingServiceApi.updateDeployStatusRequests).to.eql(
          [{
            branch,
            status: 'pending'
          }]
        )
      }
    }
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

  async updateDeploymentStatus (deployment, status) {
    this.updateDeployStatusRequests.push({
      branch: deployment.branch,
      status
    })
  }
}
