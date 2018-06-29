const yaml = require('js-yaml')
const {expect} = require('chai')
const retry = require('trytryagain')
const PrApps = require('../../../../lib/prApps')
const GitProject = require('../../../../lib/gitProject')
const FlynnApiClientMemory = require('./flynnApiClientMemory')
const CodeHostingServiceApiMemory = require('./codeHostingServiceApiMemory')
const PrAppsClientMemory = require('./prAppsClientMemory')
const GitMemory = require('./gitMemory')
const BaseActor = require('./baseActor')
const DeploymentRepoMemory = require('./deploymentRepoMemory')
const ConfigLoaderMemory = require('./configLoaderMemory')
const WorkQueue = require('../../../../lib/workQueue')

module.exports = class MemoryAssembly {
  async setup () {}
  async start () {
    this.fakeFlynnApi = {
      apps: new Set(),
      firstApp () {
        return Array.from(this.apps)[0]
      },
      providers: [],
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
      workQueue: new WorkQueue({timeout: 10}),
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
      deploymentRepo: new DeploymentRepoMemory(),
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

  async pushBranch () {
    return 1
  }

  withExistingPrApp (config) {
    this.flynnApiClient.withExistingApp(`pr-${this.prNumber}`, config)
  }

  withClosedPullRequest () {}

  async openPullRequest ({prNumber = this.prNumber, branch = this.currentBranch} = {}) {
    return this.prAppsClient.openPullRequest(branch, prNumber)
  }

  async reopenPullRequest () {
    return this.prAppsClient.reopenPullRequest(this.currentBranch, this.prNumber)
  }

  async pushMoreChanges () {
    return this.prAppsClient.pushMoreChanges(this.currentBranch, this.prNumber)
  }

  async closePullRequest () {
    await this.prAppsClient.closePullRequest(this.prNumber)
  }

  async mergePullRequest () {
    await this.prAppsClient.mergePullRequest(this.prNumber)
  }

  async followLastDeploymentUrl ({url, prNotifier} = {}) {
    url = url || this.getLastDeploymentUrl(prNotifier)
    const [lastDeployId] = url.match(/[^/]+$/)
    return this.prAppsClient.getDeployment(lastDeployId)
  }

  lookUpDeploymentId (deployment) {
    return deployment.id
  }

  async shouldSeeNewDeploymentDetails ({prevDeploymentId, prNotifier}) {
    await retry(async () => {
      const newDeployment = await this.followLastDeploymentUrl({prNotifier})
      expect(newDeployment.id).to.exist // eslint-disable-line
      expect(Number(newDeployment.id)).to.be.above(Number(prevDeploymentId))
    })
  }

  shouldSeeDeployLogs ({logs}) {
    expect(logs).to.deep.eql(['all done'])
  }

  async shouldNotSeeDeployLogs (url) {
    const [lastDeployId] = url.match(/[^/]+$/)
    const deployment = await this.prAppsClient.getDeployment(lastDeployId)
    expect(deployment).to.be.eq(undefined)
  }

  shouldSeeValidationError ({logs}) {
    expect(logs[0]).to.match(/TypeError: Expected a value/)
  }

  shouldSeeDeployStatus ({status}) {
    expect(status).to.eq('success')
  }

  shouldSeeDeployedAppVersion ({version}, expectedVersion) {
    expect(version).to.eq(expectedVersion)
  }

  shouldSeeLinkToFlynnApp ({flynnAppUrl}) {
    expect(flynnAppUrl).to.eq(
      `https://dashboard.${this.flynnApiClient.clusterDomain}/apps/${this.fakeFlynnApi.firstApp().id}`
    )
  }

  shouldSeeLinkToDeployedApp ({deployedAppUrl}) {
    expect(deployedAppUrl).to.eq(`https://pr-${this.prNumber}.${this.flynnApiClient.clusterDomain}`)
  }

  followDeployedAppLink () {}
  shouldSeeNewApp () {}
  shouldSeeUpdatedApp () {}
  shouldNotSeeApp (appName = `pr-${this.prNumber}`) {
    expect(
      this.flynnApiClient.findAppByName(appName) === undefined ||
      this.fakeFlynnApi.notPushed
    ).to.eq(true)
  }

  addPrAppConfig (config) {
    this.configLoader.setConfig(yaml.safeLoad(config))
  }

  async assertEnvironmentSet (env) {
    await retry(() => {
      expect(this.fakeFlynnApi.firstApp().release.env).to.eql(env)
    })
  }

  async assertServiceIsUp ({service, domain}) {
    await retry(() => {
      expect(this.fakeFlynnApi.firstApp().routes).to.deep.include({
        type: 'http',
        service,
        domain
      })
    })
  }

  async assertResources (resources) {
    await retry(() => {
      expect(this.fakeFlynnApi.firstApp().resources.map(r => {
        const {name} = this.fakeFlynnApi.providers.find(p => p.id === r.provider)
        return name
      }).sort()).to.eql(resources.sort())
    })
  }

  async redeploy (deployment) {
    return this.prAppsClient.redeploy(deployment)
  }

  async shouldNotBeAbleToRedeploy () {}
}
