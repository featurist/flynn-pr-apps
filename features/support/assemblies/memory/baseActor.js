const {expect} = require('chai')

module.exports = class BaseActor {
  async shouldSeeDeployStarted (prNotifier) {
    await prNotifier.waitForDeployStarted()
  }

  async shouldSeeDeployFinished (prNotifier) {
    await prNotifier.waitForDeployFinished()
  }

  async shouldSeeOneDeployAfterAnother (prNotifier) {
    await prNotifier.assertDeploysAreSequential()
  }

  async shouldSeeDeploySuccessful (prNotifier) {
    await prNotifier.waitForDeploySuccessful()
  }

  async shouldSeeDeployFailed (prNotifier, options) {
    await prNotifier.waitForDeployFailed(options)
  }

  getLastDeploymentUrl (prNotifier) {
    return prNotifier.getDeploymentUrl()
  }

  shouldBeAbleToPushLargeRepos () {
    const initDeploy = this.fakeFlynnApi.firstApp().deploys[0]
    expect(initDeploy.release.processes.slugbuilder.resources.temp_disk.limit).to.eq(1073741824)
    expect(initDeploy.release.processes.slugbuilder.resources.memory.limit).to.eq(2147483648)
  }

  shouldSeeUpdatedVersion ({oldVersion, newVersion}) {
    expect(newVersion).to.exist // eslint-disable-line
    expect(newVersion).to.not.eq(oldVersion)
  }
}
