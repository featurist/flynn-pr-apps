const {execSync} = require('child_process')
const express = require('express')
const fs = require('fs-extra')
const https = require('https')
const subdomain = require('express-subdomain')
const createFlynnGitReceiveApp = require('./flynnGitReceiveApp')
const bodyParser = require('body-parser')
const basicauth = require('basicauth-middleware')
const morgan = require('morgan')
const debug = require('debug')('pr-apps:fakeFlynnApi')
const getRandomPort = require('./getRandomPort')
const FsAdapter = require('../../../../lib/fsAdapter')
const ShellAdapter = require('../../../../lib/shellAdapter')

module.exports = class FakeFlynnApi {
  constructor ({authKey}) {
    this.authKey = authKey
    this.apps = {}
    this.fs = new FsAdapter()
  }

  async start () {
    this.port = await getRandomPort()
    this.reposDir = this.fs.makeTempDir()
    this.appsDir = this.fs.makeTempDir()

    const app = express()
    const deployedApps = express()
    const flynnController = express()

    const basicAuth = basicauth(
      '',
      this.authKey,
      'Fake Flynn needs basic auth'
    )

    if (debug.enabled) {
      app.use(morgan('dev'))
    }

    flynnController.use(bodyParser.json())
    flynnController.use(basicAuth)

    let appId = 1
    flynnController.post('/apps', (req, res) => {
      this._createAppRepo(req.body.name).then(() => {
        debug('Creating app %s', req.body.name)
        this.apps[appId++] = req.body.name
        res.status(201).end()
      }).catch(e => {
        console.error(e.stack)
        res.status(500).end()
      })
    })

    flynnController.get('/apps', (req, res) => {
      const apps = Object.entries(this.apps).map(([key, value]) => {
        return {
          id: key,
          name: value
        }
      })
      res.send(apps)
    })

    flynnController.delete('/apps/:appId', async (req, res) => {
      try {
        const appName = this.apps[req.params.appId]
        debug('Destroying app %s', appName)
        delete this.apps[req.params.appId]
        this._destroyAppRepo(appName)
        this._removeAppWebLocation(appName)
        res.status(200).end()
      } catch (e) {
        console.error(e.stack)
        res.status(500).end()
      }
    })

    const flynnGitReceive = createFlynnGitReceiveApp({
      reposDir: this.reposDir
    })
    flynnGitReceive.use(basicAuth)
    flynnGitReceive.on('post-receive', (repo) => {
      this._deployToWebLocation(repo)
    })

    deployedApps.get('/', (req, res) => {
      const appName = req.subdomains[1]
      const appIndex = `${this.appsDir}/${appName}/index.html`
      if (fs.existsSync(appIndex)) {
        res.sendFile(appIndex)
      } else {
        res.send('Pr App Not Found')
      }
    })

    app.use(subdomain('controller.prs', flynnController))
    app.use(subdomain('git.prs', flynnGitReceive))
    app.use(subdomain('*.prs', deployedApps))

    const key = fs.readFileSync(`${__dirname}/server.key`, 'utf8')
    const cert = fs.readFileSync(`${__dirname}/server.crt`, 'utf8')

    this.appServer = https.createServer({key, cert}, app)
      .listen(this.port)
  }

  async stop () {
    this.fs.rmRf(this.reposDir)
    this.fs.rmRf(this.appsDir)
    return new Promise(resolve => this.appServer.close(resolve))
  }

  async _createAppRepo (appName) {
    const dir = `${this.reposDir}/${appName}.git`
    fs.ensureDirSync(dir)

    const sh = new ShellAdapter({cwd: dir})
    await sh('git init --bare')
  }

  _deployToWebLocation (repo) {
    const appName = repo.replace(/\.git/, '')
    const appDir = `${this.appsDir}/${appName}`
    fs.ensureDirSync(appDir)

    const postReceiveHook =
      `git --work-tree=${appDir} --git-dir=${this.reposDir}/${repo} checkout -f`

    execSync(postReceiveHook, {stdio: 'inherit'})
  }

  _destroyAppRepo (appName) {
    const dir = `${this.reposDir}/${appName}.git`
    debug('Destroying app repo %s', dir)
    if (!fs.existsSync(dir)) {
      throw new Error(`Attempting to destroy non-existing repo ${dir}`)
    }
    fs.removeSync(dir)
  }

  _removeAppWebLocation (appName) {
    const dir = `${this.appsDir}/${appName}`
    debug('Removing web location %s', dir)
    if (!fs.existsSync(dir)) {
      throw new Error(`Attempting to remove non-existing web location ${dir}`)
    }
    fs.removeSync(dir)
  }
}
