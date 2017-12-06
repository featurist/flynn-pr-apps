const {promisify} = require('util')
const ngrok = require('ngrok')
const PrApps = require('../../../../lib/prApps')
const GithubApiAdapter = require('../../../../lib/githubApiAdapter')
const createPrAppsApp = require('../../../..')
const createPrNotifierApp = require('./prNotifierApp')
const GithubService = require('./githubService')
const GitRepo = require('./gitRepo')

const testGhRepoUrl = `https://${process.env.TEST_GH_USER_TOKEN}@github.com/${process.env.TEST_GH_REPO}.git`

module.exports = class GithubAssembly {
  async setup () {
    this.prAppsHost = await promisify(ngrok.connect)(9874)
  }

  async start () {
    const codeHostingServiceApi = new GithubApiAdapter({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })
    const prApps = new PrApps({codeHostingServiceApi})
    this.prAppsApp = createPrAppsApp(prApps)
    this.prNotifierApp = createPrNotifierApp()
    this.prAppsApp.use(this.prNotifierApp)

    this.prAppsServer = this.prAppsApp.listen(9874)

    this.repo = new GitRepo({repoUrl: testGhRepoUrl})
    this.codeHostingService = new GithubService({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN,
      prNotifier: this.prNotifierApp
    })

    await Promise.all([
      this.codeHostingService.deleteWebhooks(),
      this.codeHostingService.closeAllPrs()
    ])
    await this.codeHostingService.deleteNonMasterBranches()

    await Promise.all([
      this.codeHostingService.createWebhook(`${this.prAppsHost}/webhook`, ['push', 'pull_request']),
      this.codeHostingService.createWebhook(`${this.prAppsHost}/deployments`, ['deployment', 'deployment_status']),
      this.repo.create()
    ])
  }

  async stop () {
    await Promise.all([
      this.repo.destroy(),
      this.prAppsServer
        ? new Promise(resolve => this.prAppsServer.close(resolve))
        : Promise.resolve(),
      this.prNotifierServer
        ? new Promise(resolve => this.prNotifierServer.close(resolve))
        : Promise.resolve()
    ])
  }

  createActor () {
    return new ApiActor({
      repo: this.repo,
      codeHostingService: this.codeHostingService
    })
  }
}

class ApiActor {
  constructor ({repo, codeHostingService}) {
    this.codeHostingService = codeHostingService
    this.repo = repo
  }

  async start () {}

  async stop () {}

  async pushBranch () {
    this.currentBranch = await this.repo.pushBranch()
  }

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async shouldSeeDeployStarted () {
    await this.currentPrNotifier.waitForDeployStarted()
  }
}
