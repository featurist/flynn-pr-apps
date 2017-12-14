const GitHubApi = require('github')
const retry = require('trytryagain')
const {expect} = require('chai')

module.exports = class GithubService {
  constructor ({prNotifier, repo, token}) {
    [this.owner, this.repo] = repo.split('/')
    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token
    })
    this.prNotifier = prNotifier
  }

  async createWebhook (url, events) {
    await this.ghApi.repos.createHook({
      owner: this.owner,
      repo: this.repo,
      name: 'web',
      events,
      active: true,
      config: {
        url,
        content_type: 'json',
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
      prs.map(pr => {
        return this.ghApi.pullRequests.update({
          owner: this.owner,
          repo: this.repo,
          number: pr.number,
          state: 'closed'
        })
      })
    )
  }

  async deleteWebhooks () {
    const {data: hooks} = await this.ghApi.repos.getHooks({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      hooks.map(({id}) => {
        return this.ghApi.repos.deleteHook({
          owner: this.owner,
          repo: this.repo,
          id
        })
      })
    )
  }

  async openPullRequest (branch) {
    const {data: pr} = await this.ghApi.pullRequests.create({
      owner: this.owner,
      repo: this.repo,
      title: 'Adds Feature1',
      head: branch,
      base: 'master'
    })
    return new CurrentPrNotifier({prNotifier: this.prNotifier, pr})
  }
}

class CurrentPrNotifier {
  constructor ({prNotifier, pr}) {
    this.prNotifier = prNotifier
    this.pr = pr
    this.prNumber = pr.number
  }

  async waitForDeployStarted () {
    await retry(async () => {
      const currentDeploymentStatus = this.prNotifier.deploymentStatusEvents[0]
      expect(currentDeploymentStatus).to.eql({
        ref: this.pr.head.ref,
        state: 'pending'
      })
    }, {timeout: 10000})
  }

  async waitForDeployFinished () {
    await retry(async () => {
      expect(this.prNotifier.deploymentStatusEvents.length).to.eq(2)
    }, {timeout: 10000})
  }

  async waitForDeploySuccessful () {
    await retry(async () => {
      const currentDeploymentStatus = this.prNotifier.deploymentStatusEvents[1]
      expect(currentDeploymentStatus).to.eql({
        ref: this.pr.head.ref,
        state: 'success'
      })
    }, {timeout: 10000})
  }
}
