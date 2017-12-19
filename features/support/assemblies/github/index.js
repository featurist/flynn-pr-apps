const {promisify} = require('util')
const ngrok = require('ngrok')
const {expect} = require('chai')
const PrApps = require('../../../../lib/prApps')
const GithubApiAdapter = require('../../../../lib/githubApiAdapter')
const GitProject = require('../../../../lib/gitProject')
const FlynnService = require('../../../../lib/flynnService')
const createPrAppsApp = require('../../../..')
const createPrNotifierApp = require('./prNotifierApp')
const GithubService = require('./githubService')
const GitRepo = require('./gitRepo')
const HeadlessBrowser = require('./headlessBrowser')
const FakeFlynnApi = require('./fakeFlynnApi')
const getRandomPort = require('./getRandomPort')

const testGhRepoUrl = `https://${process.env.TEST_GH_USER_TOKEN}@github.com/${process.env.TEST_GH_REPO}.git`

module.exports = class GithubAssembly {
  async setup () {
    this.port = await getRandomPort()
    this.prAppsHost = await promisify(ngrok.connect)(this.port)
  }

  async start () {
    const codeHostingServiceApi = new GithubApiAdapter({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })
    const scmProject = new GitProject({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })

    // so that http client can request `https://` urls served by fake flynn api
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    this.fakeFlynnApi = new FakeFlynnApi({
      authKey: 'flynnApiAuthKey'
    })
    await this.fakeFlynnApi.start()

    this.clusterDomain = `prs.localtest.me:${this.fakeFlynnApi.port}`
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

    this.userLocalRepo = new GitRepo({repoUrl: testGhRepoUrl})
    this.codeHostingService = new GithubService({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN,
      prNotifier: this.prNotifierApp
    })

    await Promise.all([
      this.codeHostingService.deleteWebhooks(),
      this.codeHostingService.closeAllPrs(),
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
      repo: this.userLocalRepo,
      clusterDomain: this.clusterDomain,
      codeHostingService: this.codeHostingService
    })
  }
}

class ApiActor {
  constructor ({repo, codeHostingService, clusterDomain}) {
    this.codeHostingService = codeHostingService
    this.clusterDomain = clusterDomain
    this.userLocalRepo = repo
    this.currentBranch = 'Feature1'
  }

  async start () {}

  async stop () {}

  async pushBranch () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<h1>Hello World!</h1>')
  }

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async pushMoreChanges () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<p>This is Pr Apps</p>')
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

  async followDeployedAppLink () {
    const browser = new HeadlessBrowser()
    const deployedAppUrl = `https://pr-${this.currentPrNotifier.prNumber}.${this.clusterDomain}`
    this.appIndexPageContent = await browser.visit(deployedAppUrl)
  }

  async shouldSeeDeployedApp () {
    expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1>')
  }
}