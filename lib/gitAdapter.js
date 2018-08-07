const ShellAdapter = require('./shellAdapter')

class Repo {
  constructor ({fs, sh, remoteVersion, debug}) {
    this.fs = fs
    this.remoteVersion = remoteVersion
    this.sh = sh
    this.debug = debug
  }

  async push (remoteUrl, logCollector) {
    this.debug('Pushing HEAD to remote %s master', remoteUrl)

    await this.sh(`git remote add flynn ${remoteUrl}`)
    await this.sh('git -c http.sslVerify=false push -f flynn HEAD:refs/heads/master', {logCollector})
  }

  get path () {
    return this.sh.cwd
  }

  remove () {
    this.fs.rmRf(this.path)
  }
}

module.exports = class GitAdapter {
  constructor ({fs, contextDebug = require('debug')}) {
    this.fs = fs
    this.contextDebug = contextDebug
    this.debug = contextDebug('pr-apps:gitAdapter')
  }

  async makePushableClone ({repoUrl, branch}) {
    this.debug('Cloning %s#%s', repoUrl, branch)

    const tmpDir = this.fs.makeTempDir()
    const sh = new ShellAdapter({cwd: tmpDir, contextDebug: this.contextDebug})

    await sh(`git clone --depth 1 --branch ${branch} ${repoUrl} ${tmpDir}`)
    const remoteVersion = await sh('git rev-parse HEAD')
    this.fs.rmRf(`${tmpDir}/.git`)
    await sh('git init')
    await sh('git config --add user.name pr-apps')
    await sh('git config --add user.email pr-apps@pr-apps.pr')
    await sh('git add .')
    await sh('git commit -m "pr deploy" -q')

    return new Repo({
      sh,
      remoteVersion,
      fs: this.fs,
      debug: this.debug
    })
  }
}
