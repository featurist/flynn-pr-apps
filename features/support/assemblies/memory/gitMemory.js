module.exports = class GitMemory {
  constructor (fakeFlynnApi) {
    this.fakeFlynnApi = fakeFlynnApi
    this.remoteVersion = 1
  }

  makePushableClone () {
    const remoteVersion = this.remoteVersion++
    return {
      remoteVersion,
      push: (url, logCollector) => {
        if (this.fakeFlynnApi.nextDeployShouldFail) {
          delete this.fakeFlynnApi.nextDeployShouldFail
          throw new Error('Pre receive hook failed')
        }
        delete this.fakeFlynnApi.notPushed
        logCollector.write('all done')
        logCollector.end()
      },
      remove () {}
    }
  }
}
