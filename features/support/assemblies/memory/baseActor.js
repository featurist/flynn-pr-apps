const {expect} = require('chai')

module.exports = class BaseActor {
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
