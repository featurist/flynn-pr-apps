const yaml = require('js-yaml')
const {expect} = require('chai')
const omit = require('lowscore/omit')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FlynnApiClientMemory = require('./flynnApiClientMemory')
const CodeHostingServiceApiMemory = require('./codeHostingServiceApiMemory')
const PrAppsClientMemory = require('./prAppsClientMemory')
const GitMemory = require('./gitMemory')
const ConfigLoaderMemory = require('./configLoaderMemory')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {
    this.fakeFlynnApi = {
      notPushed: true,
      failNextDeploy () {
        this.nextDeployShouldFail = true
      }
    }
  }
  async stop () {}

  createActor () {
    this.clusterDomain = 'prs.example.com'
    this.flynnApiClient = new FlynnApiClientMemory(this.clusterDomain)

    this.codeHostingServiceApi = new CodeHostingServiceApiMemory()
    const configLoader = new ConfigLoaderMemory()

    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject: new GitProject({
        token: 'secret',
        remoteUrl: 'https://github.com/asdfsd/bbbb.git',
        git: new GitMemory(this.fakeFlynnApi)
      }),
      flynnApiClient: this.flynnApiClient,
      configLoader
    })
    this.prAppsClient = new PrAppsClientMemory({prApps})

    return new MemoryActor({
      prAppsClient: this.prAppsClient,
      flynnApiClient: this.flynnApiClient,
      fakeFlynnApi: this.fakeFlynnApi,
      configLoader
    })
  }

  enablePrEvents () {
    this.prAppsClient.enable()
  }
}

class MemoryActor {
  constructor ({prAppsClient, flynnApiClient, fakeFlynnApi, configLoader}) {
    this.flynnApiClient = flynnApiClient
    this.prAppsClient = prAppsClient
    this.configLoader = configLoader
    this.fakeFlynnApi = fakeFlynnApi
    this.currentBranch = 'Feature1'
    this.prNumber = 23
    this.version = 1
  }

  async start () {}
  async stop () {}

  async pushBranch () {}

  withExistingPrApp (config) {
    this.flynnApiClient.withExistingApp(`pr-${this.prNumber}`, config)
  }

  withClosedPullRequest () {}

  async openPullRequest () {
    this.currentPrNotifier = await this.prAppsClient.openPullRequest(this.currentBranch, this.prNumber, ++this.version)
  }

  async reopenPullRequest () {
    this.currentPrNotifier = await this.prAppsClient.reopenPullRequest(this.currentBranch, this.prNumber, ++this.version)
  }

  async pushMoreChanges () {
    this.currentPrNotifier = await this.prAppsClient.pushMoreChanges(this.currentBranch, this.prNumber, ++this.version)
  }

  async closePullRequest () {
    await this.prAppsClient.closePullRequest(this.prNumber)
  }

  async mergePullRequest () {
    await this.prAppsClient.mergePullRequest(this.prNumber)
  }

  getAppVersion () {
    return this.flynnApiClient.lastDeploy.release.env.VERSION
  }

  shouldSeeAppVersion (version) {
    expect(this.version).to.eq(version)
  }

  shouldSeeUpdatedVersion ({oldVersion, newVersion}) {
    expect(newVersion).to.not.eq(oldVersion)
  }

  async shouldSeeDeployStarted () {
    this.currentPrNotifier.waitForDeployStarted()
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

  followDeployedAppLink () {}
  shouldSeeNewApp () {}
  shouldBeAbleToPushLargeRepos () {}
  shouldSeeUpdatedApp () {}
  shouldNotSeeApp () {
    expect(
      this.flynnApiClient.app === 'destroyed' ||
      this.fakeFlynnApi.notPushed
    ).to.eq(true)
  }

  addPrAppConfig (config) {
    this.configLoader.setConfig(yaml.safeLoad(config))
  }

  assertEnvironmentSet (env) {
    expect(omit(this.flynnApiClient.release.env, 'VERSION')).to.eql(env)
  }

  assertServiceIsUp ({service, domain}) {
    expect(this.flynnApiClient.routes).to.deep.include({
      type: 'http',
      service,
      domain
    })
  }

  assertResources (resources) {
    expect(this.flynnApiClient.resources.map(r => {
      const {name} = this.flynnApiClient.providers.find(p => p.id === r.provider)
      return name
    }).sort()).to.eql(resources.sort())
  }
}
