const simpleGit = require('simple-git/promise')
const tmp = require('tmp')
const debug = require('debug')('pr-apps:gitProject')

class LocalProject {
  constructor ({repoUrl, branch}) {
    this.repoUrl = repoUrl
    this.branch = branch
  }

  async clone () {
    this.tmpDir = tmp.dirSync({unsafeCleanup: true})
    this.repo = simpleGit(this.tmpDir.name)
      .env('GIT_SSL_NO_VERIFY', true)

    await this.repo.clone(this.repoUrl, this.tmpDir.name, ['--depth', 20, '--branch', this.branch])
  }

  async push (remoteUrl) {
    debug('Pushing HEAD to remote %s master', remoteUrl)

    await this.repo.addRemote('flynn', remoteUrl)
    await this.repo.push('flynn', `HEAD:refs/heads/master`)
  }

  async remove () {
    return this.tmpDir.removeCallback()
  }
}

module.exports = class GitProject {
  constructor ({repo, token}) {
    this.repoUrl = `https://${token}@github.com/${repo}.git`
  }

  async clone (branch) {
    debug('Cloning branch %s', branch)

    const project = new LocalProject({repoUrl: this.repoUrl, branch})
    await project.clone()
    return project
  }
}
