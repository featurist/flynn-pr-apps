module.exports = class CodeHostingServiceApiMemory {
  constructor () {
    this.updateDeployStatusRequests = []
  }

  async createDeployment (branch) {
    return {
      branch
    }
  }

  async updateDeploymentStatus (deployment, status, {deployedAppUrl, flynnAppUrl}) {
    if (this.recordRequests) {
      this.updateDeployStatusRequests.push({
        branch: deployment.branch,
        status,
        deployedAppUrl,
        flynnAppUrl
      })
    }
  }
}
