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
      deployScript: new DeployScriptMemory()
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

  async shouldSeeDeployFinished () {
    this.currentPrNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    this.currentPrNotifier.waitForDeploySuccessful()
  }
}

class MemoryCodeHostingService {
  constructor ({prApps}) {
    this.prApps = prApps
  }

  async openPullRequest (branch) {
    await this.prApps.deployPullRequest(branch)
    return new PrNotifier(this.prApps.codeHostingServiceApi, branch)
  }
}

class PrNotifier {
  constructor (codeHostingServiceApi, branch) {
    this.codeHostingServiceApi = codeHostingServiceApi
    this.branch = branch
  }

  waitForDeployStarted () {
    expect(this.codeHostingServiceApi.updateDeployStatusRequests[0]).to.eql(
      {
        branch: this.branch,
        status: 'pending'
      }
    )
  }

  waitForDeployFinished () {
    expect(this.codeHostingServiceApi.updateDeployStatusRequests.length).to.eq(2)
  }

  waitForDeploySuccessful () {
    expect(this.codeHostingServiceApi.updateDeployStatusRequests[1]).to.eql(
      {
        branch: this.branch,
        status: 'success'
      }
    )
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

class ScmProjectMemory {
  async clone () {
    return '/path/to/workspace'
  }
}

class DeployScriptMemory {
  run ({cwd}) {
    expect(cwd).to.eq('/path/to/workspace')
  }
}
