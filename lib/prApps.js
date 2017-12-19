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

    const localProject = await this.scmProject.clone(branch)

    const appName = `pr-${prNumber}`
    const flynnApp = await this.flynnService.createApp(appName)
    await localProject.push(flynnApp.gitUrl)

    const deployedAppUrl = flynnApp.webUrl
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success', deployedAppUrl)

    // TODO how to surface this in cukes?
    await localProject.remove()
  }

  async deployUpdate ({branch, prNumber}) {
    const deployment = await this.codeHostingServiceApi.createDeployment(branch)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending')

    const localProject = await this.scmProject.clone(branch)
    const appName = `pr-${prNumber}`
    // TODO what if there is no app? (e.g. the pr was opened before pr-apps setup)
    const flynnApp = await this.flynnService.getApp(appName)
    await localProject.push(flynnApp.gitUrl)

    const deployedAppUrl = flynnApp.webUrl
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success', deployedAppUrl)
    await localProject.remove()
  }
}