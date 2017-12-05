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
        expect(this.prApps.codeHostingServiceApi.createDeployRequests).to.eql([{branch}])
      }
    }
  }
}

class MemoryCodeHostingServiceApi {
  constructor () {
    this.createDeployRequests = []
  }

  async createDeployment (branch) {
    this.createDeployRequests.push({branch})
  }
}
