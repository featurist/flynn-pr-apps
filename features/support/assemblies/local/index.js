const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FsAdapter = require('../../../../lib/fsAdapter')
const GitAdapter = require('../../../../lib/gitAdapter')
const FlynnApiClient = require('../../../../lib/flynnApiClient')
const ShellAdapter = require('../../../../lib/shellAdapter')
const ConfigLoader = require('../../../../lib/configLoader')
const createPrAppsApp = require('../../../..')
const GitRepo = require('../github/gitRepo')
const FakeFlynnApi = require('../github/fakeFlynnApi')
const CodeHostingServiceApiMemory = require('../memory/codeHostingServiceApiMemory')
const getRandomPort = require('../github/getRandomPort')
const PrNotifier = require('../memory/prNotifier')
const ApiActorBase = require('./apiActorBase')
const PrAppsWebClient = require('./prAppsWebClient')

module.exports = class LocalAssembly {
  setup () {}

  async start () {
    [this.prAppsPort, this.fakeFlynnApiPort] = await Promise.all([
      getRandomPort(),
      getRandomPort()
    ])

    this.fs = new FsAdapter()
    const git = new GitAdapter({fs: this.fs})

    this.remoteRepoPath = this.fs.makeTempDir()
    const remoteRepoSh = new ShellAdapter({cwd: this.remoteRepoPath})

    const remoteUrl = `file:///${this.remoteRepoPath}`
    const scmProject = new GitProject({
      remoteUrl,
      git
    })

    this.clusterDomain = `prs.localtest.me:${this.fakeFlynnApiPort}`

    this.fakeFlynnApi = new FakeFlynnApi({
      authKey: 'flynnApiAuthKey',
      port: this.fakeFlynnApiPort,
      clusterDomain: this.clusterDomain
    })

    const flynnApiClient = new FlynnApiClient({
      clusterDomain: this.clusterDomain,
      authKey: 'flynnApiAuthKey'
    })

    this.codeHostingServiceApi = new CodeHostingServiceApiMemory()

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

    this.userLocalRepo = new GitRepo({remoteUrl})

    this.prAppsServer = this.prAppsApp.listen(this.prAppsPort)
    this.prAppsClient = new PrAppsWebClient(`http://localhost:${this.prAppsPort}`, this.webhookSecret)

    await Promise.all([
      remoteRepoSh('git init --bare'),
      this.fakeFlynnApi.start(),
      this.userLocalRepo.create()
    ])
  }

  async stop () {
    this.fs.rmRf(this.remoteRepoPath)

    await Promise.all([
      this.userLocalRepo.destroy(),
      this.fakeFlynnApi.stop(),
      this.prAppsServer
        ? new Promise(resolve => this.prAppsServer.close(resolve))
        : Promise.resolve()
    ])
  }

  enablePrEvents () {
    this.prAppsClient.enable()
  }

  createActor () {
    return new LocalActor({
      userLocalRepo: this.userLocalRepo,
      prAppsClient: this.prAppsClient,
      codeHostingServiceApi: this.codeHostingServiceApi,
      fakeFlynnApi: this.fakeFlynnApi
    })
  }
}

class LocalActor extends ApiActorBase {
  constructor ({
    codeHostingServiceApi,
    userLocalRepo,
    prAppsClient,
    fakeFlynnApi
  }) {
    super({userLocalRepo, fakeFlynnApi, currentBranch: 'Feature1'})
    this.prAppsClient = prAppsClient
    this.codeHostingServiceApi = codeHostingServiceApi
    this.prNumber = 23
    this.version = 875

    this.prNotifier = new PrNotifier({
      prEventsListener: codeHostingServiceApi,
      branch: this.currentBranch,
      prNumber: this.prNumber,
      fakeFlynnApi: this.fakeFlynnApi
    })
  }

  async openPullRequest () {
    const body = {
      action: 'opened',
      number: this.prNumber,
      pull_request: {
        head: {
          ref: this.currentBranch,
          sha: this.version
        }
      }
    }
    await this.prAppsClient.post('/webhook', body)
  }

  async reopenPullRequest () {
    const body = {
      action: 'reopened',
      number: this.prNumber,
      pull_request: {
        head: {
          ref: this.currentBranch,
          sha: this.version
        }
      }
    }
    await this.prAppsClient.post('/webhook', body)
  }

  async mergePullRequest () {
    const body = {
      action: 'closed',
      number: this.prNumber,
      pull_request: {
        head: {
          ref: this.currentBranch
        }
      }
    }
    await this.prAppsClient.post('/webhook', body)
  }

  async closePullRequest () {
    const body = {
      action: 'closed',
      number: this.prNumber,
      pull_request: {
        head: {
          ref: this.currentBranch
        }
      }
    }
    await this.prAppsClient.post('/webhook', body)
  }

  async pushMoreChanges () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<p>This is Pr Apps</p>')
    const body = {
      action: 'synchronize',
      number: this.prNumber,
      pull_request: {
        head: {
          ref: this.currentBranch,
          sha: ++this.version
        }
      }
    }
    await this.prAppsClient.post('/webhook', body)
  }
}
