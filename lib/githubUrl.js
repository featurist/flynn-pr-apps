const {URL} = require('url')

module.exports = class GithubUrl {
  constructor ({repoUrl, token}) {
    const u = new URL(repoUrl)
    u.username = token
    this.authenticatedRepoUrl = u.toString()

    ;[this.owner, this.repo] = u.pathname.split('/').filter(_ => _)
    this.repo = this.repo.replace(/\.git$/, '')
  }
}
