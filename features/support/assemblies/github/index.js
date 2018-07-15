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
const DeploymentRepo = require('../../../../lib/deploymentRepo')
const WorkQueue = require('../../../../lib/workQueue')
const db = require('../../../../db/models')
const resetDb = require('../../resetDb')
const createPrNotifierApp = require('./prNotifierApp')
const startTestApp = require('../../startTestApp')
const GithubApi = require('./githubApi')
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

    const deploymentRepo = new DeploymentRepo(db)

    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject,
      workQueue: new WorkQueue({timeout: 200}),
      flynnApiClientFactory: (clusterDomain) => {
        return new FlynnApiClient({
          clusterDomain,
          authKey: 'flynnApiAuthKey'
        })
      },
      appInfo: {
        domain: `pr-apps.${this.clusterDomain}`
      },
      deploymentRepo,
      configLoader: new ConfigLoader()
    })

    const ghApi = new GithubApi({
      repo: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })

    this.serverWithSubdomains = startTestApp({
      prAppsApp: createPrAppsApp({
        webhookSecret: 'bananas',
        prApps
      }),
      fakeFlynnApi: this.fakeFlynnApi,
      port: fakeFlynnApiPort
    })

    this.webhookSecret = 'webhook secret'
    const prAppsApp = createPrAppsApp({
      webhookSecret: this.webhookSecret,
      prApps
    })
    this.prNotifierApp = createPrNotifierApp({ghApi})
    prAppsApp.use(this.prNotifierApp)

    this.ghAccessiblePrAppsServer = prAppsApp.listen(this.port)

    this.userLocalRepo = new GitRepo({
      remoteUrl: process.env.TEST_GH_REPO,
      token: process.env.TEST_GH_USER_TOKEN
    })

    this.codeHostingService = new GithubService({
      ghApi,
      prEventsListener: this.prNotifierApp,
      fakeFlynnApi: this.fakeFlynnApi
    })

    await Promise.all([
      resetDb(db),
      this.codeHostingService.deleteWebhooks(),
      this.codeHostingService.closeAllPrs(),
      this.userLocalRepo.create()
    ])
    await this.codeHostingService.deleteNonMasterBranches()
  }

  async stop () {
    this.codeHostingServiceApi.disable()
    await Promise.all([
      this.ghAccessiblePrAppsServer
        ? new Promise(resolve => this.ghAccessiblePrAppsServer.close(resolve))
        : Promise.resolve(),
      this.prNotifierServer
        ? new Promise(resolve => this.prNotifierServer.close(resolve))
        : Promise.resolve()
    ])
    await Promise.all([
      this.userLocalRepo.destroy(),
      this.fakeFlynnApi.stop()
    ])

    if (process.env.SLEEP_BETWEEN_TESTS) {
      await new Promise((resolve, reject) => {
        setTimeout(resolve, Number(process.env.SLEEP_BETWEEN_TESTS))
      })
    }
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

  async openPullRequest ({branch = this.currentBranch} = {}) {
    const {prNotifier, prNumber} = await this.codeHostingService.openPullRequest(branch)
    this.prNumber = prNumber
    return prNotifier
  }

  async reopenPullRequest () {
    const {prNotifier, prNumber} = await this.codeHostingService.reopenPullRequest(this.prNumber)
    this.prNumber = prNumber
    return prNotifier
  }

  async pushMoreChanges () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<p>This is Pr Apps</p>')
    return this.codeHostingService.newPrNotifier(this.currentBranch)
  }

  async mergePullRequest (prNumber = this.prNumber) {
    await this.codeHostingService.mergePullRequest(prNumber)
  }

  async closePullRequest () {
    await this.codeHostingService.closePullRequest(this.prNumber)
  }
}
