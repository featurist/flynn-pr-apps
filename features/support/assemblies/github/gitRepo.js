const fs = require('fs')
const path = require('path')
const simpleGit = require('simple-git/promise')
const tmp = require('tmp')

module.exports = class GitRepo {
  constructor ({repoUrl}) {
    this.repoUrl = repoUrl
  }

  async create () {
    this.tmpDir = tmp.dirSync({unsafeCleanup: true})
    this.git = simpleGit(this.tmpDir.name)
    await this.git.init()
    await this.git.addRemote('origin', this.repoUrl)
    await this.git.pull('origin', 'master')
  }

  async destroy () {
    return this.tmpDir.removeCallback()
  }

  async pushBranch (branch) {
    await this.git.checkoutLocalBranch(branch)
    fs.writeFileSync(path.join(this.tmpDir.name, 'index.html'), branch)
    await this.git.add('.')
    await this.git.commit('add index.js')
    await this.git.push(['--set-upstream', 'origin', branch])
  }
}
