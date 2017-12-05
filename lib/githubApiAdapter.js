const GitHubApi = require('github')

module.exports = class GithubApiAdapter {
  constructor ({token, repo}) {
    const [owner, r] = repo.split('/')
    this.owner = owner
    this.repo = r
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
