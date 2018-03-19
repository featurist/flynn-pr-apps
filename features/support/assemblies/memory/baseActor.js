const {expect} = require('chai')

module.exports = class BaseActor {
  getAppVersion () {
    return this.fakeFlynnApi.firstApp().appVersion
  }

  shouldSeeAppVersion (version, expectedVersion) {
    expect(version).to.exist // eslint-disable-line
    if (expectedVersion) {
      expect(version).to.eq(expectedVersion)
    }
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
