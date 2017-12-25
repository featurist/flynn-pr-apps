const GitHubApi = require('github')
const debug = require('debug')('pr-apps:github')
const GithubUrl = require('./githubUrl')

module.exports = class GithubApiAdapter {
  constructor ({token, repo}) {
    ({owner: this.owner, repo: this.repo} = new GithubUrl({repo, token}))

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
      environment: 'qa',
      transient_environment: true
    })
    return deployment
  }

  async updateDeploymentStatus (deployment, status, {deployedAppUrl, flynnAppUrl}) {
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
