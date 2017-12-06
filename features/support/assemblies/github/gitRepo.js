const fs = require('fs')
const path = require('path')
const simpleGit = require('simple-git/promise')
const tmp = require('tmp')

module.exports = class GitRepo {
  constructor ({repoUrl}) {
    this.repoUrl = repoUrl
    this.featureBranch = 'Feature1'
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

  async pushBranch () {
    await this.git.checkoutLocalBranch(this.featureBranch)
    fs.writeFileSync(path.join(this.tmpDir.name, 'index.js'), 'console.log(1)')
    await this.git.add('.')
    await this.git.commit('add index.js')
    await this.git.push(['--set-upstream', 'origin', this.featureBranch])
    return this.featureBranch
  }
}
