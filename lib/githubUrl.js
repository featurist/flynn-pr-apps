const {URL} = require('url')

module.exports = class GithubUrl {
  constructor ({repo, token}) {
    const u = new URL(repo)
    u.username = token
    this.authenticatedRepoUrl = u.toString()

    ;[this.owner, this.repo] = u.pathname.split('/').filter(_ => _)
    this.repo = this.repo.replace(/\.git$/, '')
  }
}
