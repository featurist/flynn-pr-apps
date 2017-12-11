module.exports = class PrApps {
  constructor ({
    codeHostingServiceApi,
    scmProject,
    deployScript,
    prAppsClusterDomain
  }) {
    this.scmProject = scmProject
    this.deployScript = deployScript
    this.codeHostingServiceApi = codeHostingServiceApi
    this.prAppsClusterDomain = prAppsClusterDomain
  }

  async deployPullRequest ({branch, prNumber}) {
    const deployment = await this.codeHostingServiceApi.createDeployment(branch)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending')
    const workspaceDir = await this.scmProject.clone()
    this.deployScript.run({cwd: workspaceDir})

    const deployedAppUrl = `https://pr-${prNumber}.${this.prAppsClusterDomain}`
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success', deployedAppUrl)
  }
}
