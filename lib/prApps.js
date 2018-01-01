module.exports = class PrApps {
  constructor ({
    codeHostingServiceApi,
    scmProject,
    flynnService,
    configLoader
  }) {
    this.scmProject = scmProject
    this.codeHostingServiceApi = codeHostingServiceApi
    this.flynnService = flynnService
    this.configLoader = configLoader
  }

  async deployPullRequest ({branch, prNumber}) {
    await this._deploy({branch, prNumber, newApp: true})
  }

  async deployUpdate ({branch, prNumber}) {
    await this._deploy({branch, prNumber, newApp: false})
  }

  async destroyPrApp (prNumber) {
    const appName = `pr-${prNumber}`
    await this.flynnService.destroyApp(appName)
  }

  async _deploy ({branch, prNumber, newApp}) {
    const appName = `pr-${prNumber}`

    await this.scmProject.clone(branch, async (localProject) => {
      const flynnApp = newApp
        ? await this.flynnService.createApp(appName)
        : await this.flynnService.getApp(appName)

      const deployment = await this.codeHostingServiceApi.createDeployment(branch)
      await this.codeHostingServiceApi.updateDeploymentStatus(deployment, 'pending', {
        flynnAppUrl: flynnApp.flynnUrl
      })

      let status = 'failure'
      try {
        const config = this.configLoader.load(localProject.path)

        await flynnApp.ensureConfig(config)
        await localProject.push(flynnApp.gitUrl)
        status = 'success'
      } finally {
        await this.codeHostingServiceApi.updateDeploymentStatus(deployment, status, {
          flynnAppUrl: flynnApp.flynnUrl,
          deployedAppUrl: flynnApp.webUrl
        })
      }
    })
  }
}
