const httpism = require('httpism')
const {expect} = require('chai')
const retry = require('trytryagain')
const crypto = require('crypto')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FsAdapter = require('../../../../lib/fsAdapter')
const GitAdapter = require('../../../../lib/gitAdapter')
const FlynnService = require('../../../../lib/flynnService')
const ShellAdapter = require('../../../../lib/shellAdapter')
const createPrAppsApp = require('../../../..')
const GitRepo = require('../github/gitRepo')
const FakeFlynnApi = require('../github/fakeFlynnApi')
const CodeHostingServiceApiMemory = require('../memory/codeHostingServiceApiMemory')
const getRandomPort = require('../github/getRandomPort')
const PrNotifier = require('../memory/prNotifier')
const HeadlessBrowser = require('../github/headlessBrowser')

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
      flynnService: this.flynnService
    })
    this.webhookSecret = 'webhook secret'
    this.prAppsApp = createPrAppsApp({
      webhookSecret: this.webhookSecret,
      prApps
    })

    this.userLocalRepo = new GitRepo({remoteUrl})

    this.prAppsServer = this.prAppsApp.listen(this.prAppsPort)

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

  createGithubWebhooks () {
    this.codeHostingServiceApi.resetRequestsLog()
  }

  createActor () {
    return new LocalActor({
      userLocalRepo: this.userLocalRepo,
      flynnService: this.flynnService,
      codeHostingServiceApi: this.codeHostingServiceApi,
      prAppsUrl: `http://localhost:${this.prAppsPort}`,
      webhookSecret: this.webhookSecret
    })
  }
}

class LocalActor {
  constructor ({
    prAppsUrl,
    flynnService,
    codeHostingServiceApi,
    userLocalRepo,
    webhookSecret
  }) {
    this.userLocalRepo = userLocalRepo
    this.codeHostingServiceApi = codeHostingServiceApi
    this.flynnService = flynnService

    this.currentBranch = 'Feature1'
    this.prNumber = 23

    this.prNotifier = new PrNotifier({
      codeHostingServiceApi,
      branch: this.currentBranch
    })

    this.prAppsClient = httpism.client(prAppsUrl, {
      headers: {'X-GitHub-Event': 'pull_request'}
    }, [
      function (req, next) {
        const shasum = crypto.createHmac('sha1', webhookSecret)
          .update(JSON.stringify(req.body))

        req.headers['X-Hub-Signature'] = 'sha1=' + shasum.digest('hex')

        return next()
      }
    ])
  }

  start () {}
  stop () {}

  async pushBranch () {
    await this.userLocalRepo.pushBranch(this.currentBranch, '<h1>Hello World!</h1>')
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

  async withExistingPrApp () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.createPrApp()
    await this.shouldSeeDeployFinished()
    await this.followDeployedAppLink()
    await this.shouldSeeNewApp()
  }

  async withClosedPullRequest () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.closePullRequest()
  }

  async createPrApp () {
    const {gitUrl} = await this.flynnService.createApp(`pr-${this.prNumber}`)
    await this.userLocalRepo.pushCurrentBranchToFlynn(gitUrl)
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

  async shouldSeeDeployStarted () {
    await this.prNotifier.waitForDeployStarted()
  }

  async shouldSeeDeployFinished () {
    await this.prNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    await this.prNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed () {
    await this.prNotifier.waitForDeployFailed()
  }

  async followDeployedAppLink () {
    const browser = new HeadlessBrowser()
    const deployedAppUrl = `https://pr-${this.prNumber}.${this.flynnService.clusterDomain}`
    this.appIndexPageContent = await browser.visit(deployedAppUrl)
  }

  async shouldSeeNewApp () {
    await retry(async () => {
      await this.followDeployedAppLink()
      expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1>')
    })
  }

  async shouldSeeUpdatedApp () {
    await retry(async () => {
      await this.followDeployedAppLink()
      expect(this.appIndexPageContent).to.eq('<h1>Hello World!</h1><p>This is Pr Apps</p>')
    })
  }

  async shouldNotSeeApp () {
    await retry(async () => {
      await this.followDeployedAppLink()
      expect(this.appIndexPageContent).to.eq('Pr App Not Found')
    }, {timeout: 10000, interval: 500})
  }
}
