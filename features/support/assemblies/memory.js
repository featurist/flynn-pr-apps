module.exports = class MemoryAssembly {
  async setup () {}
  async start () {}
  async stop () {}
  createActor () {
    const codeHostingService = new MemoryCodeHostingService()
    const repo = new MemoryRepo()
    return new MemoryActor({repo, codeHostingService})
  }
}

class MemoryActor {
  constructor ({repo, codeHostingService}) {
    this.codeHostingService = codeHostingService
    this.repo = repo
  }

  async start () {}
  async stop () {}

  async pushBranch () {
    const branch = {
      name: 'Feature1'
    }
    this.currentBranch = branch
    await this.repo.pushBranch(branch)
  }

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async shouldSeeDeployStarted () {
    await this.currentPrNotifier.waitForDeployStarted()
  }
}

class MemoryCodeHostingService {
  async openPullRequest (branch) {
    return new MemoryPrNotifier()
  }
}

class MemoryPrNotifier {
  async waitForDeployStarted () {
  }
}

class MemoryRepo {
  async pushBranch (branch) {}
}
