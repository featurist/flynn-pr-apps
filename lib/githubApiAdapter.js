const GitHubApi = require('@octokit/rest')
const GithubUrl = require('./githubUrl')

module.exports = class GithubApiAdapter {
  constructor ({token, repo, contextDebug}) {
    ({owner: this.owner, repo: this.repo} = new GithubUrl({repoUrl: repo, token}))

    this.debug = contextDebug('pr-apps:github')
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
      return this.debug('createDeployment disabled')
    }

    this.debug('Creating deployment for branch %s', branch)

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

  async updateDeploymentStatus (deployStatus, {status, deployedAppUrl, deploymentUrl}) {
    if (this.disabled) {
      this.debug('updateDeploymentStatus disabled')
    }

    this.debug('Updating deployment status to %s, deployedAppUrl: %s, deploymentUrl: %s', status, deployedAppUrl, deploymentUrl)

    await this.ghApi.repos.createDeploymentStatus({
      owner: this.owner,
      repo: this.repo,
      id: deployStatus.id,
      state: status,
      log_url: deploymentUrl,
      environment_url: deployedAppUrl
    })
  }
}
