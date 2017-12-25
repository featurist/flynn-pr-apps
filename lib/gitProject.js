const GithubUrl = require('./githubUrl')

module.exports = class GitProject {
  constructor ({repo, token, git}) {
    ({authenticatedRepoUrl: this.repoUrl} = new GithubUrl({repo, token}))
    this.git = git
  }

  async clone (branch, fn) {
    const repo = await this.git.makeShallowPushableClone({
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
