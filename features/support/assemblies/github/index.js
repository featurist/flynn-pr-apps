const {promisify} = require('util')
const ngrok = require('ngrok')
const PrApps = require('../../../../lib/prApps')
const GithubApiAdapter = require('../../../../lib/githubApiAdapter')
const GitProject = require('../../../../lib/gitProject')
const FsAdapter = require('../../../../lib/fsAdapter')
const GitAdapter = require('../../../../lib/gitAdapter')
const FlynnApiClient = require('../../../../lib/flynnApiClient')
const ConfigLoader = require('../../../../lib/configLoader')
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

    this.codeHostingServiceApi = new GithubApiAdapter({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })

    const fakeFlynnApiPort = await getRandomPort()
    this.clusterDomain = `prs.localtest.me:${fakeFlynnApiPort}`

    this.fakeFlynnApi = new FakeFlynnApi({
      authKey: 'flynnApiAuthKey',
      port: fakeFlynnApiPort,
      clusterDomain: this.clusterDomain
    })

    const flynnApiClient = new FlynnApiClient({
      clusterDomain: this.clusterDomain,
      authKey: 'flynnApiAuthKey'
    })

    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject,
      flynnApiClient,
      configLoader: new ConfigLoader()
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
      prEventsListener: this.prNotifierApp,
      fakeFlynnApi: this.fakeFlynnApi
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
    this.codeHostingServiceApi.disable()
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

  enablePrEvents () {
    return Promise.all([
      this.codeHostingService.createWebhook(`${this.prAppsHost}/webhook`, ['pull_request'], this.webhookSecret),
      this.codeHostingService.createWebhook(`${this.prAppsHost}/deployments_test`, ['deployment_status'])
    ])
  }

  createActor () {
    return new GithubActor({
      userLocalRepo: this.userLocalRepo,
      fakeFlynnApi: this.fakeFlynnApi,
      codeHostingService: this.codeHostingService
    })
  }
}

class GithubActor extends ApiActorBase {
  constructor ({userLocalRepo, codeHostingService, fakeFlynnApi}) {
    super({userLocalRepo, fakeFlynnApi, currentBranch: 'Feature1'})
    this.codeHostingService = codeHostingService
  }

  async openPullRequest () {
    this.prNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
    this.prNumber = this.prNotifier.prNumber
  }

  async reopenPullRequest () {
    this.prNotifier = await this.codeHostingService.reopenPullRequest(this.prNumber)
    this.prNumber = this.prNotifier.prNumber
  }

  async pushMoreChanges () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<p>This is Pr Apps</p>')
  }

  async mergePullRequest () {
    await this.codeHostingService.mergePullRequest(this.prNumber)
  }

  async closePullRequest () {
    await this.codeHostingService.closePullRequest(this.prNumber)
  }
}
