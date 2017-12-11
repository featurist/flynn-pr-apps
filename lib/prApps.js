module.exports = class PrApps {
  constructor ({
    codeHostingServiceApi,
    scmProject,
    flynnService
  }) {
    this.scmProject = scmProject
    this.codeHostingServiceApi = codeHostingServiceApi
    this.flynnService = flynnService
  }

  async deployPullRequest ({branch, prNumber}) {
    const deployment = await this.codeHostingServiceApi.createDeployment(branch)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending')

    const localProject = await this.scmProject.clone()

    const appName = `pr-${prNumber}`
    const flynnApp = await this.flynnService.createApp(appName)
    localProject.push(flynnApp.gitUrl)

    const deployedAppUrl = flynnApp.webUrl
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success', deployedAppUrl)
  }
}
