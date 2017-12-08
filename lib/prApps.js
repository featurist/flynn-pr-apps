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
    const workspaceDir = await this.scmProject.clone()
    this.deployScript.run({cwd: workspaceDir})
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success')
  }
}
