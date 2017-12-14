const GitHubApi = require('github')
const debug = require('debug')('pr-apps:github')

module.exports = class GithubApiAdapter {
  constructor ({token, repo}) {
    [this.owner, this.repo] = repo.split('/')
    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token
    })
  }

  async createDeployment (branch) {
    debug('Creating deployment for branch %s', branch)

    const {data: deployment} = await this.ghApi.repos.createDeployment({
      owner: this.owner,
      repo: this.repo,
      ref: branch,
      transient_environment: true
    })
    return deployment
  }

  async updateDeploymentStatus (deployment, status, deployedAppUrl = '') {
    debug('Updating deployment status to %s, url: %s', status, deployedAppUrl)

    await this.ghApi.repos.createDeploymentStatus({
      owner: this.owner,
      repo: this.repo,
      id: deployment.id,
      state: status,
      environment_url: deployedAppUrl
    })
  }
}
