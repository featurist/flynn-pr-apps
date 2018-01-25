const GitHubApi = require('github')
const GithubUrl = require('../../../../lib/githubUrl')
const PrNotifier = require('../memory/prNotifier')
const debug = require('debug')('pr-apps:test:githubService')

module.exports = class GithubService {
  constructor ({prEventsListener, repo, token, fakeFlynnApi}) {
    ({owner: this.owner, repo: this.repo} = new GithubUrl({repoUrl: repo, token}))
    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token
    })
    this.prEventsListener = prEventsListener
    this.fakeFlynnApi = fakeFlynnApi
  }

  async createWebhook (url, events, secret) {
    debug('Creating webhook: url=%s, events=%o', url, events)
    await this.ghApi.repos.createHook({
      owner: this.owner,
      repo: this.repo,
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
    const {data: branches} = await this.ghApi.repos.getBranches({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      branches.map(({name}) => {
        if (name === 'master') {
          return Promise.resolve()
        } else {
          debug('Deleting branch %s', name)
          return this.ghApi.gitdata.deleteReference({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${name}`
          })
        }
      })
    )
  }

  async closeAllPrs () {
    const {data: prs} = await this.ghApi.pullRequests.getAll({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      prs.map(pr => this.closePullRequest(pr.number))
    )
  }

  async deleteWebhooks () {
    const {data: hooks} = await this.ghApi.repos.getHooks({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      hooks.map(({id}) => {
        debug('Deleting webhook %s', id)
        return this.ghApi.repos.deleteHook({
          owner: this.owner,
          repo: this.repo,
          id
        })
      })
    )
  }

  async openPullRequest (branch) {
    debug('Opening pull request for branch %s', branch)
    const {data: pr} = await this.ghApi.pullRequests.create({
      owner: this.owner,
      repo: this.repo,
      title: 'Adds Feature1',
      head: branch,
      base: 'master'
    })
    return new PrNotifier({
      prEventsListener: this.prEventsListener,
      fakeFlynnApi: this.fakeFlynnApi,
      prNumber: pr.number,
      branch: pr.head.ref,
      checkUrls: false
    })
  }

  async mergePullRequest (prNumber) {
    debug('Merging pull request %s', prNumber)
    await this.ghApi.pullRequests.merge({
      owner: this.owner,
      repo: this.repo,
      number: prNumber
    })
  }

  async closePullRequest (prNumber) {
    debug('Closing pull require %s', prNumber)
    await this.ghApi.pullRequests.update({
      owner: this.owner,
      repo: this.repo,
      number: prNumber,
      state: 'closed'
    })
  }

  async reopenPullRequest (prNumber) {
    debug('Reopening pull require %s', prNumber)
    const {data: pr} = await this.ghApi.pullRequests.update({
      owner: this.owner,
      repo: this.repo,
      number: prNumber,
      state: 'open'
    })
    return new PrNotifier({
      prEventsListener: this.prEventsListener,
      fakeFlynnApi: this.fakeFlynnApi,
      prNumber: pr.number,
      branch: pr.head.ref,
      checkUrls: false
    })
  }
}
