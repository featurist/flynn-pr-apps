const GitHubApi = require('github')

module.exports = class Github {
  constructor ({token, owner, repo}) {
    this.owner = owner
    this.repo = repo
    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token
    })
  }

  async createDeployment (branch) {
    await this.ghApi.repos.createDeployment({
      owner: this.owner,
      repo: this.repo,
      ref: branch
    })
  }
}
