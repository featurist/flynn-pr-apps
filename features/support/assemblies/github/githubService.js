const PrNotifier = require('../memory/prNotifier')
const debug = require('debug')('pr-apps:test:githubService')

module.exports = class GithubService {
  constructor ({prEventsListener, ghApi, fakeFlynnApi}) {
    this.ghApi = ghApi
    this.prEventsListener = prEventsListener
    this.fakeFlynnApi = fakeFlynnApi
  }

  async createWebhook (url, events, secret) {
    debug('Creating webhook: url=%s, events=%o', url, events)
    await this.ghApi.createHook({
      name: 'web',
      events,
      active: true,
      config: {
        url,
        content_type: 'json',
        secret,
        insecure_ssl: '1'
      }
    })
  }

  async deleteNonMasterBranches () {
    const branches = await this.ghApi.getBranches()
    return Promise.all(
      branches.map(({name}) => {
        if (name === 'master') {
          return Promise.resolve()
        } else {
          debug('Deleting branch %s', name)
          return this.ghApi.deleteReference({
            ref: `heads/${name}`
          })
        }
      })
    )
  }

  async closeAllPrs () {
    const prs = await this.ghApi.getAllPrs()
    return Promise.all(
      prs.map(pr => this.closePullRequest(pr.number))
    )
  }

  async deleteWebhooks () {
    const hooks = await this.ghApi.getHooks()
    return Promise.all(
      hooks.map(({id}) => {
        debug('Deleting webhook %s', id)
        return this.ghApi.deleteHook({id})
      })
    )
  }

  async openPullRequest (branch) {
    debug('Opening pull request for branch %s', branch)
    const pr = await this.ghApi.createPullRequest({
      title: 'Adds Feature1',
      head: branch,
      base: 'master'
    })
    return new PrNotifier({
      prEventsListener: this.prEventsListener,
      fakeFlynnApi: this.fakeFlynnApi,
      prNumber: pr.number,
      branch: pr.head.ref
    })
  }

  async mergePullRequest (prNumber) {
    debug('Merging pull request %s', prNumber)
    let retries = 0
    const merge = async () => {
      try {
        await this.ghApi.mergePullRequest({
          number: prNumber
        })
      } catch (err) {
        if (retries < 5 && err.message.match(/Base branch was modified/)) {
          retries++
          await new Promise((resolve, reject) => {
            setTimeout(async () => {
              await merge()
              resolve()
            }, 1000)
          })
        } else {
          throw err
        }
      }
    }
    await merge()
  }

  async closePullRequest (prNumber) {
    debug('Closing pull require %s', prNumber)
    await this.ghApi.closePullRequest({
      number: prNumber
    })
  }

  async reopenPullRequest (prNumber) {
    debug('Reopening pull require %s', prNumber)
    const pr = await this.ghApi.reopenPullRequest({
      number: prNumber
    })
    return new PrNotifier({
      prEventsListener: this.prEventsListener,
      fakeFlynnApi: this.fakeFlynnApi,
      prNumber: pr.number,
      branch: pr.head.ref
    })
  }
}
