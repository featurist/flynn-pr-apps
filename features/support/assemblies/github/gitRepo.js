const fs = require('fs')
const path = require('path')
const simpleGit = require('simple-git/promise')
const tmp = require('tmp')
const GithubUrl = require('../../../../lib/githubUrl')

module.exports = class GitRepo {
  constructor ({repo, token}) {
    ({authenticatedRepoUrl: this.repoUrl} = new GithubUrl({repo, token}))
  }

  async create () {
    this.tmpDir = tmp.dirSync({unsafeCleanup: true})
    this.git = simpleGit(this.tmpDir.name)
      .env('GIT_SSL_NO_VERIFY', true)
    await this.git.init()
    await this.git.addConfig('user.name', 'pr-apps')
    await this.git.addConfig('user.email', 'pr-apps@stuff.com')

    fs.writeFileSync(`${this.tmpDir.name}/readme.md`, '# Pr Apps test repo')
    await this.git.add('.')
    await this.git.commit('init')
    await this.git.addRemote('origin', this.repoUrl)
    await this.git.push(['-f', 'origin', 'master'])
  }

  async destroy () {
    return this.tmpDir.removeCallback()
  }

  async pushBranch (branch, content) {
    const index = path.join(this.tmpDir.name, 'index.html')

    if (this.currentBranch === branch) {
      fs.appendFileSync(index, content)

      await this.git.add('.')
      await this.git.commit('more changes')
      await this.git.push('origin', branch)
    } else {
      await this.git.checkoutLocalBranch(branch)
      this.currentBranch = branch

      fs.writeFileSync(index, content)

      await this.git.add('.')
      await this.git.commit('add index.js')
      await this.git.push(['--set-upstream', 'origin', branch])
    }
  }

  async pushCurrentBranchToFlynn (repoUrl) {
    await this.git.addRemote('flynn', repoUrl)
    await this.git.push('flynn', `${this.currentBranch}:master`)
  }
}
