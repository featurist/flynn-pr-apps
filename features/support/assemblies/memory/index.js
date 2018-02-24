const yaml = require('js-yaml')
const {expect} = require('chai')
const omit = require('lowscore/omit')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FlynnApiClientMemory = require('./flynnApiClientMemory')
const CodeHostingServiceApiMemory = require('./codeHostingServiceApiMemory')
const PrAppsClientMemory = require('./prAppsClientMemory')
const GitMemory = require('./gitMemory')
const BaseActor = require('./baseActor')
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
    this.flynnApiClient = new FlynnApiClientMemory({
      fakeFlynnApi: this.fakeFlynnApi
    })

    this.codeHostingServiceApi = new CodeHostingServiceApiMemory()
    const configLoader = new ConfigLoaderMemory()

    this.clusterDomain = 'prs.example.com'

    const prApps = new PrApps({
      codeHostingServiceApi: this.codeHostingServiceApi,
      scmProject: new GitProject({
        token: 'secret',
        remoteUrl: 'https://github.com/asdfsd/bbbb.git',
        git: new GitMemory(this.fakeFlynnApi)
      }),
      flynnApiClientFactory: (clusterDomain) => {
        this.flynnApiClient.clusterDomain = clusterDomain
        return this.flynnApiClient
      },
      appInfo: {
        domain: `pr-apps.${this.clusterDomain}`
      },
      configLoader
    })
    this.prAppsClient = new PrAppsClientMemory({
      prApps,
      fakeFlynnApi: this.fakeFlynnApi
    })

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

class MemoryActor extends BaseActor {
  constructor ({prAppsClient, flynnApiClient, fakeFlynnApi, configLoader}) {
    super()
    this.flynnApiClient = flynnApiClient
    this.prAppsClient = prAppsClient
    this.configLoader = configLoader
    this.fakeFlynnApi = fakeFlynnApi
    this.currentBranch = 'Feature1'
    this.prNumber = 23
  }

  async start () {}
  async stop () {}

  async pushBranch () {}

  withExistingPrApp (config) {
    this.flynnApiClient.withExistingApp(`pr-${this.prNumber}`, config)
  }

  withClosedPullRequest () {}

  async openPullRequest () {
    this.currentPrNotifier = await this.prAppsClient.openPullRequest(this.currentBranch, this.prNumber, 1)
  }

  async reopenPullRequest () {
    this.currentPrNotifier = await this.prAppsClient.reopenPullRequest(this.currentBranch, this.prNumber, 1)
  }

  async pushMoreChanges () {
    const currentVersion = this.getAppVersion()
    this.currentPrNotifier = await this.prAppsClient.pushMoreChanges(this.currentBranch, this.prNumber, currentVersion + 1)
  }

  async closePullRequest () {
    await this.prAppsClient.closePullRequest(this.prNumber)
  }

  async mergePullRequest () {
    await this.prAppsClient.mergePullRequest(this.prNumber)
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

  followDeployedAppLink () {}
  shouldSeeNewApp () {}
  shouldBeAbleToPushLargeRepos () {}
  shouldSeeUpdatedApp () {}
  shouldNotSeeApp () {
    expect(
      this.fakeFlynnApi.app === 'destroyed' ||
      this.fakeFlynnApi.notPushed
    ).to.eq(true)
  }

  addPrAppConfig (config) {
    this.configLoader.setConfig(yaml.safeLoad(config))
  }

  assertEnvironmentSet (env) {
    expect(omit(this.fakeFlynnApi.release.env, 'VERSION')).to.eql(env)
  }

  assertServiceIsUp ({service, domain}) {
    expect(this.fakeFlynnApi.routes).to.deep.include({
      type: 'http',
      service,
      domain
    })
  }

  assertResources (resources) {
    expect(this.fakeFlynnApi.resources.map(r => {
      const {name} = this.fakeFlynnApi.providers.find(p => p.id === r.provider)
      return name
    }).sort()).to.eql(resources.sort())
  }
}
