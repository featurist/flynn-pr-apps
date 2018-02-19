const GitHubApi = require('@octokit/rest')
const debug = require('debug')('pr-apps:github')
const GithubUrl = require('./githubUrl')

module.exports = class GithubApiAdapter {
  constructor ({token, repo}) {
    ({owner: this.owner, repo: this.repo} = new GithubUrl({repoUrl: repo, token}))

    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token
    })
  }

  disable () {
    this.disabled = true
  }

  async createDeployment (branch) {
    if (this.disabled) {
      return debug('createDeployment disabled')
    }

    debug('Creating deployment for branch %s', branch)

    const {data: deployment} = await this.ghApi.repos.createDeployment({
      owner: this.owner,
      repo: this.repo,
      ref: branch,
      environment: 'qa',
      required_contexts: [],
      auto_merge: false,
      transient_environment: true
    })
    return deployment
  }

  async updateDeploymentStatus (deployment, status, {deployedAppUrl, flynnAppUrl}) {
    if (this.disabled) {
      return debug('updateDeploymentStatus disabled')
    }

    debug('Updating deployment status to %s, deployedAppUrl: %s, flynnAppUrl: %s', status, deployedAppUrl, flynnAppUrl)

    await this.ghApi.repos.createDeploymentStatus({
      owner: this.owner,
      repo: this.repo,
      id: deployment.id,
      state: status,
      log_url: flynnAppUrl,
      environment_url: deployedAppUrl
    })
  }
}
