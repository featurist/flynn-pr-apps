module.exports = class PrApps {
  constructor ({codeHostingServiceApi}) {
    this.codeHostingServiceApi = codeHostingServiceApi
  }

  async deployPullRequest (branch) {
    await this.codeHostingServiceApi.createDeployment(branch)
  }
}
