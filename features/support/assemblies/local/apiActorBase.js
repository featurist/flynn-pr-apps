const retry = require('trytryagain')
const {expect} = require('chai')
const HeadlessBrowser = require('../github/headlessBrowser')
const retryTimeout = require('../../retryTimeout')
const BaseActor = require('../memory/baseActor')
const clone = require('../../../../lib/clone')

module.exports = class ApiActorBase extends BaseActor {
  constructor ({
    userLocalRepo,
    currentBranch,
    fakeFlynnApi
  }) {
    super()
    this.userLocalRepo = userLocalRepo
    this.currentBranch = currentBranch
    this.fakeFlynnApi = fakeFlynnApi
  }

  start () {}
  stop () {}

  async withExistingPrApp (config) {
    await this.pushBranch()
    await this.openPullRequest()
    await this.createPrApp(config)
    await this.followDeployedAppLink()
    await this.shouldSeeNewApp()
  }

  async withClosedPullRequest () {
    await this.pushBranch()
    await this.openPullRequest()
    await this.closePullRequest()
  }

  async pushBranch (branch = this.currentBranch) {
    return this.userLocalRepo.pushBranch(branch, '<h1>Hello World!</h1>')
  }

  async createPrApp (config = {}) {
    const {gitUrl, app} = await this.fakeFlynnApi.createApp(`pr-${this.prNumber}`)
    if (config.resources) {
      this.fakeFlynnApi.addResources(app, config.resources)
    }
    this.fakeFlynnApi.addEnv(app, config.env)
    await this.userLocalRepo.pushCurrentBranchToFlynn(gitUrl)
  }

  async redeploy (logPage) {
    await logPage.clickButton('⟳ redeploy')
  }

  async followDeployedAppLink (appName = `pr-${this.prNumber}`) {
    const browser = new HeadlessBrowser()
    const deployedAppUrl = `https://${appName}.${this.fakeFlynnApi.clusterDomain}`
    this.appIndexPageContent = await browser.visit(deployedAppUrl)
  }

  async shouldSeeNewApp () {
    expect(this.appIndexPageContent.text()).to.eq('Hello World!')
  }

  async shouldSeeUpdatedApp () {
    expect(this.appIndexPageContent.text()).to.eq('Hello World!This is Pr Apps')
  }

  async shouldNotSeeApp (appName) {
    await retry(async () => {
      await this.followDeployedAppLink(appName)
      expect(this.appIndexPageContent.text()).to.eq('Pr App Not Found')
    }, {timeout: retryTimeout, interval: 100})
  }

  async addPrAppConfig (config) {
    await this.userLocalRepo.addFile('pr-app.yaml', config)
  }

  async assertEnvironmentSet (config) {
    await retry(() => {
      const lastDeploy = clone(this.fakeFlynnApi.firstApp().lastDeploy())
      delete lastDeploy.release.processes

      expect(lastDeploy).to.eql({
        appName: `pr-${this.prNumber}`,
        release: {
          id: this.fakeFlynnApi.firstApp().release.id,
          appName: `pr-${this.prNumber}`,
          env: config
        }
      })
    }, {timeout: retryTimeout})
  }

  async assertServiceIsUp ({service, domain}) {
    await retry(() => {
      const route = this.fakeFlynnApi.firstApp().routes.find(route => {
        return route.service === service
      })

      expect(route).to.eql({
        type: 'http',
        service,
        domain
      })
      expect(this.fakeFlynnApi.firstApp().scale).to.eql({
        web: 1,
        [service.replace(`pr-${this.prNumber}-`, '')]: 1
      })
    }, {timeout: retryTimeout})
  }

  async assertResources (resources) {
    await retry(() => {
      const firstApp = this.fakeFlynnApi.firstApp()
      expect(firstApp.resources.map(r => r.providerName).sort()).to.eql(resources.sort())
      expect(firstApp.resources.map(r => r.apps)).to.eql([
        [`pr-${this.prNumber}`],
        [`pr-${this.prNumber}`]
      ])
    }, {timeout: retryTimeout})
  }

  shouldNotSeeFlynnApp () {
    expect(this.fakeFlynnApi.apps.size).to.eq(0)
  }

  async followLastDeploymentUrl ({url, prNotifier} = {}) {
    const browser = new HeadlessBrowser()
    const deploymentUrl = url || prNotifier.getDeploymentUrl()
    return browser.visit(deploymentUrl)
  }

  lookUpDeploymentId (logPage) {
    const url = logPage.browser.location.href
    const [lastDeployId] = url.match(/[^/]+$/)
    return lastDeployId
  }

  async shouldSeeNewDeploymentDetails ({prNotifier, prevDeploymentId}) {
    await retry(async () => {
      const logPage = await this.followLastDeploymentUrl({prNotifier})
      const deploymentId = this.lookUpDeploymentId(logPage)
      expect(deploymentId).to.match(/^[^\s]{36}$/)
      expect(deploymentId).to.not.eq(prevDeploymentId)
    }, {timeout: retryTimeout})
  }

  async shouldNotSeeDeployLogs (deploymentUrl) {
    const browser = new HeadlessBrowser()
    let fail = false
    try {
      await browser.visit(deploymentUrl)
      fail = true
    } catch (e) {}
    expect(fail).to.eq(false)
  }

  shouldSeeDeployLogs (logPage) {
    const logs = logPage.text('.logChunk')
    expect(logs).to.match(/\[new branch\] HEAD -> master/)
  }

  shouldSeeValidationError (logPage) {
    const logs = logPage.text('.logChunk')
    expect(logs).to.match(/TypeError: Expected a value/)
  }

  shouldSeeDeployStatus (logPage) {
    expect(logPage.text('.status')).to.eq('success')
  }

  shouldSeeDeployedAppVersion (logPage, version) {
    expect(logPage.text('.version')).to.eq(version)
  }

  shouldSeeLinkToFlynnApp (logPage) {
    expect(logPage.attribute('.flynnAppUrl', 'href'))
      .to.eq(`https://dashboard.${this.fakeFlynnApi.clusterDomain}/apps/${this.fakeFlynnApi.firstApp().id}`)
  }

  shouldSeeLinkToDeployedApp (logPage) {
    expect(logPage.attribute('.deployedAppUrl', 'href'))
      .to.eq(`https://pr-${this.prNumber}.${this.fakeFlynnApi.clusterDomain}`)
  }

  shouldNotBeAbleToRedeploy (logPage) {
    expect(logPage.attribute('button.redeploy', 'disabled')).to.not.be.undefined // eslint-disable-line
  }
}
