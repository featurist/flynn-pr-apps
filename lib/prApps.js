module.exports = class PrApps {
  constructor ({codeHostingServiceApi}) {
    this.codeHostingServiceApi = codeHostingServiceApi
  }

  async deployPullRequest (branch) {
    const deployment = await this.codeHostingServiceApi.createDeployment(branch)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending')
  }
}
