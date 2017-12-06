module.exports = class PrApps {
  constructor ({
    codeHostingServiceApi,
    scmProject,
    deployScript
  }) {
    this.scmProject = scmProject
    this.deployScript = deployScript
    this.codeHostingServiceApi = codeHostingServiceApi
  }

  async deployPullRequest (branch) {
    const deployment = await this.codeHostingServiceApi.createDeployment(branch)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending')
    const workspacePath = await this.scmProject.clone()
    await this.deployScript.runIn(workspacePath)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success')
  }
}
