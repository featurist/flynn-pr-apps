const fs = require('fs')
const path = require('path')
const FsAdapter = require('../../../../lib/fsAdapter')
const ShellAdapter = require('../../../../lib/shellAdapter')
const GithubUrl = require('../../../../lib/githubUrl')

module.exports = class GitRepo {
  constructor ({remoteUrl, token}) {
    ({authenticatedRepoUrl: this.remoteUrl} = new GithubUrl({repoUrl: remoteUrl, token}))
    this.fs = new FsAdapter()
  }

  async create () {
    this.path = this.fs.makeTempDir()
    this.sh = new ShellAdapter({cwd: this.path})

    await this.sh('git init')
    await this.sh('git config --add user.name pr-apps')
    await this.sh('git config --add user.email pr-apps@pr-apps.pr')
    await this.sh(`git remote add origin ${this.remoteUrl}`)

    await this.addFile('readme.md', '# Pr Apps test repo')
  }

  destroy () {
    this.fs.rmRf(this.path)
  }

  async addFile (path, content) {
    fs.writeFileSync(`${this.path}/${path}`, content)
    await this.sh('git add .')
    await this.sh(`git commit -m "add ${path}"`)
    await this.sh('git push -f origin master')
  }

  async pushBranch (branch, content) {
    const index = path.join(this.path, 'index.html')

    if (this.currentBranch === branch) {
      fs.appendFileSync(index, content)

      await this.sh('git add .')
      await this.sh('git commit -m "more changes"')
      await this.sh(`git push origin ${branch}`)
    } else {
      await this.sh(`git checkout -b ${branch}`)
      this.currentBranch = branch

      fs.writeFileSync(index, content)

      await this.sh('git add .')
      await this.sh('git commit -m "add index.js"')
      await this.sh(`git push --set-upstream origin ${branch}`)
    }
  }

  async pushCurrentBranchToFlynn (remoteUrl) {
    await this.sh(`git remote add flynn ${remoteUrl}`)
    await this.sh(`git -c http.sslVerify=false push flynn ${this.currentBranch}:master`)
  }
}
