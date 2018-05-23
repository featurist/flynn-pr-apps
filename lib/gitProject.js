const GithubUrl = require('./githubUrl')

module.exports = class GitProject {
  constructor ({remoteUrl, token, git}) {
    ({authenticatedRepoUrl: this.repoUrl} = new GithubUrl({repoUrl: remoteUrl, token}))
    this.git = git
  }

  async clone (branch, fn) {
    const repo = await this.git.makePushableClone({
      repoUrl: this.repoUrl,
      branch
    })

    try {
      await fn(repo)
    } finally {
      repo.remove()
    }
  }
}
