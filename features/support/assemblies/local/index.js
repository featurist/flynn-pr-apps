const {expect} = require('chai')
const retry = require('trytryagain')
const retryTimeout = require('../../retryTimeout')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FsAdapter = require('../../../../lib/fsAdapter')
const GitAdapter = require('../../../../lib/gitAdapter')
const FlynnService = require('../../../../lib/flynnService')
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

    this.fakeFlynnApi = new FakeFlynnApi({
      authKey: 'flynnApiAuthKey',
      port: this.fakeFlynnApiPort
    })

    this.clusterDomain = `prs.localtest.me:${this.fakeFlynnApiPort}`
    this.flynnService = new FlynnService({
      clusterDomain: this.clusterDomain,
      authKey: 'flynnApiAuthKey'
    })

    this.codeHostingServiceApi = new CodeHostingServiceApiMemory()

    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject,
      flynnService: this.flynnService,
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
      flynnService: this.flynnService,
      codeHostingServiceApi: this.codeHostingServiceApi,
      fakeFlynnApi: this.fakeFlynnApi
    })
  }
}

class LocalActor extends ApiActorBase {
  constructor ({
    flynnService,
    codeHostingServiceApi,
    userLocalRepo,
    prAppsClient,
    fakeFlynnApi
  }) {
    super({userLocalRepo, flynnService, currentBranch: 'Feature1'})
    this.prAppsClient = prAppsClient
    this.codeHostingServiceApi = codeHostingServiceApi
    this.fakeFlynnApi = fakeFlynnApi
    this.prNumber = 23

    this.prNotifier = new PrNotifier({
      prEventsListener: codeHostingServiceApi,
      branch: this.currentBranch,
      prNumber: this.prNumber
    })
  }

  async openPullRequest () {
    const body = {
      action: 'opened',
      number: this.prNumber,
      pull_request: {
        head: {
          ref: this.currentBranch
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
          ref: this.currentBranch
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
          ref: this.currentBranch
        }
      }
    }
    await this.prAppsClient.post('/webhook', body)
  }

  async addPrAppConfig (config) {
    await this.userLocalRepo.addFile('pr-app.yaml', config)
  }

  async assertEnvironmentSet (config) {
    await retry(() => {
      expect(this.fakeFlynnApi.deploy).to.eql({
        appName: `pr-${this.prNumber}`,
        release: {
          appName: `pr-${this.prNumber}`,
          env: config
        }
      })
    }, {timeout: retryTimeout})
  }

  async assertServiceIsUp ({service, domain}) {
    await retry(() => {
      expect(this.fakeFlynnApi.extraRoutes).to.eql({
        type: 'http',
        service,
        domain
      })
      expect(this.fakeFlynnApi.scale).to.eql({
        web: 1,
        [service]: 1
      })
    })
  }

  async assertResources (resources) {
    await retry(() => {
      expect(this.fakeFlynnApi.resources.map(r => r.resource).sort()).to.eql(resources.sort())
      expect(this.fakeFlynnApi.resources.map(r => r.apps).sort()).to.eql([
        [`pr-${this.prNumber}`],
        [`pr-${this.prNumber}`]
      ])
    })
  }

  shouldNotSeeFlynnApp () {
    expect(Object.keys(this.fakeFlynnApi.apps).length).to.eq(0)
  }
}
