const simpleGit = require('simple-git/promise')
const GithubUrl = require('./githubUrl')
const debug = require('debug')('pr-apps:gitProject')

class LocalProject {
  constructor ({repoUrl, branch, fs}) {
    this.repoUrl = repoUrl
    this.branch = branch
    this.fs = fs
  }

  async clone () {
    this.tmpDir = this.fs.makeTempDir()
    this.repo = simpleGit(this.tmpDir)
      .env('GIT_SSL_NO_VERIFY', true)

    await this._shallowClone(this.repoUrl, this.branch)
    await this._makePushable()

    this.repo.add('.')
    this.repo.commit('deploy')
  }

  async push (remoteUrl) {
    debug('Pushing HEAD to remote %s master', remoteUrl)

    await this.repo.addRemote('flynn', remoteUrl)
    await this.repo.push(['-f', 'flynn', `HEAD:refs/heads/master`])
  }

  remove () {
    this.fs.rmRf(this.tmpDir)
  }

  async _shallowClone (repoUrl, branch) {
    await this.repo.clone(repoUrl, this.tmpDir, ['--depth', 1, '--branch', branch])
  }

  async _makePushable () {
    this.fs.rmRf(`${this.tmpDir}/.git`)
    this.repo.init()
    await this.repo.addConfig('user.name', 'pr-apps')
    await this.repo.addConfig('user.email', 'pr-apps@pr-apps.pr')
  }
}

module.exports = class GitProject {
  constructor ({repo, token, fs}) {
    ({authenticatedRepoUrl: this.repoUrl} = new GithubUrl({repo, token}))
    this.fs = fs
  }

  async clone (branch, fn) {
    debug('Cloning branch %s', branch)

    const project = new LocalProject({repoUrl: this.repoUrl, branch, fs: this.fs})
    await project.clone()
    try {
      await fn(project)
    } finally {
      // TODO how to surface this in cukes?
      project.remove()
    }
  }
}
