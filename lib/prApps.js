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
    await this._deploy({branch, prNumber, newApp: true})
  }

  async deployUpdate ({branch, prNumber}) {
    await this._deploy({branch, prNumber, newApp: false})
  }

  async _deploy ({branch, prNumber, newApp}) {
    const deployment = await this.codeHostingServiceApi.createDeployment(branch)
    await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending')

    await this.scmProject.clone(branch, async (localProject) => {
      const appName = `pr-${prNumber}`

      const flynnApp = newApp
        ? await this.flynnService.createApp(appName)
        : await this.flynnService.getApp(appName)

      await localProject.push(flynnApp.gitUrl)

      const deployedAppUrl = flynnApp.webUrl
      await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'success', deployedAppUrl)
    })
  }
}
