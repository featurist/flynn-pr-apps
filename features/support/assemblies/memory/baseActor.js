const {expect} = require('chai')

module.exports = class BaseActor {
  getAppVersion () {
    return this.fakeFlynnApi.appVersion
  }

  shouldSeeAppVersion (version, expectedVersion) {
    expect(version).to.exist // eslint-disable-line
    if (expectedVersion) {
      expect(version).to.eq(expectedVersion)
    }
  }

  shouldSeeUpdatedVersion ({oldVersion, newVersion}) {
    expect(newVersion).to.exist // eslint-disable-line
    expect(newVersion).to.not.eq(oldVersion)
  }
}
