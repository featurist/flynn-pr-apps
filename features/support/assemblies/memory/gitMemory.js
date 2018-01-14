module.exports = class GitMemory {
  constructor (fakeFlynnApi) {
    this.fakeFlynnApi = fakeFlynnApi
  }

  makeShallowPushableClone () {
    return {
      push: () => {
        if (this.fakeFlynnApi.nextDeployShouldFail) {
          delete this.fakeFlynnApi.nextDeployShouldFail
          throw new Error('Pre receive hook failed')
        }
        delete this.fakeFlynnApi.notPushed
      },
      remove () {}
    }
  }
}
