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

  async shouldSeeDeployStarted () {
    await this.prNotifier.waitForDeployStarted()
  }

  async shouldSeeDeployFinished () {
    await this.prNotifier.waitForDeployFinished()
  }

  async shouldSeeDeploySuccessful () {
    await this.prNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed (options) {
    await this.prNotifier.waitForDeployFailed(options)
  }

  async followDeployedAppLink (appName = `pr-${this.prNumber}`) {
    const browser = new HeadlessBrowser()
    const deployedAppUrl = `https://${appName}.${this.fakeFlynnApi.clusterDomain}`
    this.appIndexPageContent = await browser.visit(deployedAppUrl)
  }

  getLastDeploymentUrl () {
    return this.prNotifier.getDeploymentUrl()
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
    }, {timeout: retryTimeout, interval: 500})
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

  async followLastDeploymentUrl () {
    const browser = new HeadlessBrowser()
    const deploymentUrl = this.prNotifier.getDeploymentUrl()
    return browser.visit(deploymentUrl)
  }

  async shouldNotSeeDeployLogs (deploymentUrl) {
    const browser = new HeadlessBrowser()
    const {statusCode} = await browser.visit(deploymentUrl, {exceptions: false, response: true})
    expect(statusCode).to.eq(404)
  }

  shouldSeeDeployLogs (logPage) {
    const logs = logPage('.logChunk').text()
    expect(logs).to.match(/\[new branch\] {6}HEAD -> master/)
  }

  shouldSeeValidationError (logPage) {
    const logs = logPage('.logChunk').text()
    expect(logs).to.match(/TypeError: Expected a value/)
  }

  shouldSeeDeployStatus (logPage) {
    expect(logPage('.status').text()).to.eq('success')
  }

  shouldSeeDeployedAppVersion (logPage, version) {
    expect(logPage('.version').text()).to.eq(version)
  }

  shouldSeeLinkToFlynnApp (logPage) {
    expect(logPage('.flynnAppUrl').attr('href'))
      .to.eq(`https://dashboard.${this.fakeFlynnApi.clusterDomain}/apps/${this.fakeFlynnApi.firstApp().id}`)
  }

  shouldSeeLinkToDeployedApp (logPage) {
    expect(logPage('.deployedAppUrl').attr('href'))
      .to.eq(`https://pr-${this.prNumber}.${this.fakeFlynnApi.clusterDomain}`)
  }
}
