const {promisify} = require('util')
const ngrok = require('ngrok')
const PrApps = require('../../../../lib/prApps')
const GithubApiAdapter = require('../../../../lib/githubApiAdapter')
const GitProject = require('../../../../lib/gitProject')
const FsAdapter = require('../../../../lib/fsAdapter')
const GitAdapter = require('../../../../lib/gitAdapter')
const FlynnService = require('../../../../lib/flynnService')
const createPrAppsApp = require('../../../..')
const createPrNotifierApp = require('./prNotifierApp')
const GithubService = require('./githubService')
const GitRepo = require('./gitRepo')
const FakeFlynnApi = require('./fakeFlynnApi')
const getRandomPort = require('./getRandomPort')
const ApiActorBase = require('../local/apiActorBase')

module.exports = class GithubAssembly {
  async setup () {
    this.port = await getRandomPort()
    this.prAppsHost = await promisify(ngrok.connect)(this.port)
  }

  async start () {
    const fs = new FsAdapter()
    const git = new GitAdapter({fs})
    const scmProject = new GitProject({
      remoteUrl: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN,
      git
    })

    const codeHostingServiceApi = new GithubApiAdapter({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })

    const fakeFlynnApiPort = await getRandomPort()
    this.fakeFlynnApi = new FakeFlynnApi({
      authKey: 'flynnApiAuthKey',
      port: fakeFlynnApiPort
    })

    this.clusterDomain = `prs.localtest.me:${fakeFlynnApiPort}`
    this.flynnService = new FlynnService({
      clusterDomain: this.clusterDomain,
      authKey: 'flynnApiAuthKey'
    })

    const prApps = new PrApps({
      codeHostingServiceApi,
      scmProject,
      flynnService: this.flynnService
    })
    this.webhookSecret = 'webhook secret'
    this.prAppsApp = createPrAppsApp({
      webhookSecret: this.webhookSecret,
      prApps
    })
    this.prNotifierApp = createPrNotifierApp()
    this.prAppsApp.use(this.prNotifierApp)

    this.prAppsServer = this.prAppsApp.listen(this.port)

    this.userLocalRepo = new GitRepo({
      remoteUrl: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })

    this.codeHostingService = new GithubService({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN,
      prEventsListener: this.prNotifierApp
    })

    await Promise.all([
      this.codeHostingService.deleteWebhooks(),
      this.codeHostingService.closeAllPrs(),
      this.fakeFlynnApi.start(),
      this.userLocalRepo.create()
    ])
    await this.codeHostingService.deleteNonMasterBranches()
  }

  async stop () {
    await Promise.all([
      this.userLocalRepo.destroy(),
      this.fakeFlynnApi.stop(),
      this.prAppsServer
        ? new Promise(resolve => this.prAppsServer.close(resolve))
        : Promise.resolve(),
      this.prNotifierServer
        ? new Promise(resolve => this.prNotifierServer.close(resolve))
        : Promise.resolve()
    ])
  }

  createGithubWebhooks () {
    return Promise.all([
      this.codeHostingService.createWebhook(`${this.prAppsHost}/webhook`, ['pull_request'], this.webhookSecret),
      this.codeHostingService.createWebhook(`${this.prAppsHost}/deployments_test`, ['deployment_status'])
    ])
  }

  createActor () {
    return new GithubActor({
      userLocalRepo: this.userLocalRepo,
      flynnService: this.flynnService,
      codeHostingService: this.codeHostingService
    })
  }
}

class GithubActor extends ApiActorBase {
  constructor ({userLocalRepo, codeHostingService, flynnService}) {
    super({userLocalRepo, flynnService, currentBranch: 'Feature1'})
    this.codeHostingService = codeHostingService
  }

  async openPullRequest () {
    this.prNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async reopenPullRequest () {
    this.prNotifier = await this.codeHostingService.reopenPullRequest(this.prNotifier.prNumber)
  }

  async pushMoreChanges () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<p>This is Pr Apps</p>')
  }

  async mergePullRequest () {
    await this.codeHostingService.mergePullRequest(this.prNotifier.prNumber)
  }

  async closePullRequest () {
    await this.codeHostingService.closePullRequest(this.prNotifier.prNumber)
  }
}
