module.exports = class MemoryAssembly {
  async start () {}
  async stop () {}
  createActor () {
    const codeHostingService = new MemoryCodeHostingService()
    return new MemoryActor({codeHostingService})
  }
}

class MemoryActor {
  constructor ({codeHostingService}) {
    this.codeHostingService = codeHostingService
  }

  async start () {}
  async stop () {}

  async pushBranch () {
    const branch = {
      name: 'Feature1'
    }
    this.currentBranch = branch
    await this.codeHostingService.pushBranch(branch)
  }

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async shouldSeeDeployStarted () {
    await this.currentPrNotifier.waitForDeployStarted()
  }
}

class MemoryCodeHostingService {
  async pushBranch (branch) {}
  async openPullRequest (branch) {
    return new MemoryPrNotifier()
  }
}

class MemoryPrNotifier {
  async waitForDeployStarted () {
  }
}
