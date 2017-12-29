const {promisify} = require('util')
const ngrok = require('ngrok')
const retry = require('trytryagain')
const {expect} = require('chai')
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
const HeadlessBrowser = require('./headlessBrowser')
const FakeFlynnApi = require('./fakeFlynnApi')
const getRandomPort = require('./getRandomPort')

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
      prNotifier: this.prNotifierApp
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
    return new ApiActor({
      userLocalRepo: this.userLocalRepo,
      flynnService: this.flynnService,
      codeHostingService: this.codeHostingService
    })
  }
}

class ApiActor {
  constructor ({userLocalRepo, codeHostingService, flynnService}) {
    this.codeHostingService = codeHostingService
    this.flynnService = flynnService
    this.userLocalRepo = userLocalRepo
    this.currentBranch = 'Feature1'
  }

  async start () {}

  async stop () {}

  async withExistingPrApp () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.createPrApp()
    await this.followDeployedAppLink()
    await this.shouldSeeNewApp()
  }

  async withClosedPullRequest () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.closePullRequest()
  }

  async pushBranch () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<h1>Hello World!</h1>')
  }

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async reopenPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.reopenPullRequest(this.currentPrNotifier.prNumber)
  }

  async createPrApp () {
    const {gitUrl} = await this.flynnService.createApp(`pr-${this.currentPrNotifier.prNumber}`)
    await this.userLocalRepo.pushCurrentBranchToFlynn(gitUrl)
  }

  async pushMoreChanges () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<p>This is Pr Apps</p>')
  }

  async mergePullRequest () {
    await this.codeHostingService.mergePullRequest(this.currentPrNotifier.prNumber)
  }

  async closePullRequest () {
    await this.codeHostingService.closePullRequest(this.currentPrNotifier.prNumber)
  }

  async shouldSeeDeployStarted () {
    await this.currentPrNotifier.waitForDeployStarted()
  }

  async shouldSeeDeployFinished () {
    await this.currentPrNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    await this.currentPrNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed () {
    await this.currentPrNotifier.waitForDeployFailed()
  }

  async followDeployedAppLink () {
    const browser = new HeadlessBrowser()
    const deployedAppUrl = `https://pr-${this.currentPrNotifier.prNumber}.${this.flynnService.clusterDomain}`
    this.appIndexPageContent = await browser.visit(deployedAppUrl)
  }

  async shouldSeeNewApp () {
    expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1>')
  }

  async shouldSeeUpdatedApp () {
    expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1><p>This is Pr Apps</p>')
  }

  async shouldNotSeeApp () {
    await retry(async () => {
      await this.followDeployedAppLink()
      expect(this.appIndexPageContent).to.eq('Pr App Not Found')
    }, {timeout: 10000, interval: 500})
  }
}
