const yaml = require('js-yaml')
const {expect} = require('chai')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FlynnServiceMemory = require('./flynnServiceMemory')
const CodeHostingServiceApiMemory = require('./codeHostingServiceApiMemory')
const PrAppsClientMemory = require('./prAppsClientMemory')
const GitMemory = require('./gitMemory')
const ConfigLoaderMemory = require('./configLoaderMemory')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {
    this.fakeFlynnApi = {
      failNextDeploy () {
        this.nextDeployShouldFail = true
      }
    }
  }
  async stop () {}

  createActor () {
    this.clusterDomain = 'prs.example.com'
    this.flynnService = new FlynnServiceMemory(this.clusterDomain)
    this.codeHostingServiceApi = new CodeHostingServiceApiMemory()
    const configLoader = new ConfigLoaderMemory()

    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject: new GitProject({
        token: 'secret',
        remoteUrl: 'https://github.com/asdfsd/bbbb.git',
        git: new GitMemory(this.fakeFlynnApi)
      }),
      flynnService: this.flynnService,
      configLoader
    })
    this.prAppsClient = new PrAppsClientMemory({prApps})

    return new MemoryActor({
      prAppsClient: this.prAppsClient,
      flynnService: this.flynnService,
      configLoader
    })
  }

  enablePrEvents () {
    this.prAppsClient.enable()
  }
}

class MemoryActor {
  constructor ({prAppsClient, flynnService, configLoader}) {
    this.flynnService = flynnService
    this.prAppsClient = prAppsClient
    this.configLoader = configLoader
    this.currentBranch = 'Feature1'
    this.prNumber = 23
  }

  async start () {}
  async stop () {}

  async pushBranch () {}
  withExistingPrApp () {}
  withClosedPullRequest () {}

  async openPullRequest () {
    this.currentPrNotifier = await this.prAppsClient.openPullRequest(this.currentBranch, this.prNumber)
  }

  async reopenPullRequest () {
    this.currentPrNotifier = await this.prAppsClient.reopenPullRequest(this.currentBranch, this.prNumber)
  }

  async pushMoreChanges () {
    this.currentPrNotifier = await this.prAppsClient.pushMoreChanges(this.currentBranch, this.prNumber)
  }

  async closePullRequest () {
    await this.prAppsClient.closePullRequest(this.prNumber)
  }

  async mergePullRequest () {
    await this.prAppsClient.mergePullRequest(this.prNumber)
  }

  async shouldSeeDeployStarted () {
    this.currentPrNotifier.waitForDeployStarted()
    const lastFlynnAppUrl = this.flynnService.lastFlynnAppUrl
    expect(lastFlynnAppUrl).to.eq(`https://dashboard.prs.example.com/apps/pr-${this.prNumber}`)
  }

  async shouldSeeDeployFinished () {
    this.currentPrNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    this.currentPrNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed () {
    this.currentPrNotifier.waitForDeployFailed()
  }

  async followDeployedAppLink () {
    const deployedAppUrl = this.flynnService.lastDeployedAppUrl
    expect(deployedAppUrl).to.eq(`https://pr-${this.prNumber}.prs.example.com`)
  }

  shouldSeeNewApp () {}
  shouldSeeUpdatedApp () {}
  shouldNotSeeApp () {
    expect(this.flynnService.destroyPrAppRequests).to.eql([`pr-${this.prNumber}`])
  }

  addPrAppConfig (config) {
    this.configLoader.setConfig(yaml.safeLoad(config))
  }

  assertEnvironmentSet (env) {
    expect(this.flynnService.proposedEnv).to.eql(env)
  }

  assertServiceIsUp ({service, domain}) {
    expect(this.flynnService.proposedRoutes[service]).to.eql(domain)
  }

  assertResources (resources) {
    expect(this.flynnService.proposedResources.sort()).to.eql(resources.sort())
  }
}
