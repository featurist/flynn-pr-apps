const simpleGit = require('simple-git/promise')
const tmp = require('tmp')
const fs = require('fs-extra')
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

    await this.repo.clone(this.repoUrl, this.tmpDir.name, ['--depth', 1, '--branch', this.branch])
    fs.removeSync(`${this.tmpDir.name}/.git`)
    this.repo.init()
    this.repo.add('.')
    this.repo.commit('deploy')
  }

  async push (remoteUrl) {
    debug('Pushing HEAD to remote %s master', remoteUrl)

    await this.repo.addRemote('flynn', remoteUrl)
    await this.repo.push(['-f', 'flynn', `HEAD:refs/heads/master`])
  }

  async remove () {
    return this.tmpDir.removeCallback()
  }
}

module.exports = class GitProject {
  constructor ({repo, token}) {
    this.repoUrl = `https://${token}@github.com/${repo}.git`
  }

  async clone (branch, fn) {
    debug('Cloning branch %s', branch)

    const project = new LocalProject({repoUrl: this.repoUrl, branch})
    await project.clone()
    try {
      await fn(project)
    } finally {
      // TODO how to surface this in cukes?
      project.remove()
    }
  }
}
