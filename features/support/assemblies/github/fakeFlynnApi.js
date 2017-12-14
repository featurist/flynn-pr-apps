const tmp = require('tmp')
const simpleGit = require('simple-git/promise')
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

module.exports = class FakeFlynnApi {
  constructor ({authKey}) {
    this.authKey = authKey
  }

  async start () {
    this.port = await getRandomPort()
    this.reposDir = tmp.dirSync({unsafeCleanup: true})
    this.appsDir = tmp.dirSync({unsafeCleanup: true})

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

    flynnController.post('/apps', (req, res) => {
      this._createAppRepo(req.body.name).then(() => {
        res.status(201).end()
      }).catch(e => {
        res.status(500).send(e)
      })
    })

    const flynnGitReceive = createFlynnGitReceiveApp({
      reposDir: this.reposDir.name
    })
    flynnGitReceive.use(basicAuth)
    flynnGitReceive.on('post-receive', (repo) => {
      this._deployToWebLocation(repo)
    })

    deployedApps.get('/', (req, res) => {
      const appName = req.subdomains[1]
      res.sendFile(`${this.appsDir.name}/${appName}/index.html`)
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
    return Promise.all([
      this.reposDir ? this.reposDir.removeCallback() : Promise.resolve(),
      this.appsDir ? this.appsDir.removeCallback() : Promise.resolve(),
      new Promise(resolve => this.appServer.close(resolve))
    ])
  }

  async _createAppRepo (appName) {
    const dir = `${this.reposDir.name}/${appName}.git`
    fs.ensureDirSync(dir)

    const repo = simpleGit(dir)
    await repo.init(true)
  }

  _deployToWebLocation (repo) {
    const appName = repo.replace(/\.git/, '')
    const appDir = `${this.appsDir.name}/${appName}`
    fs.ensureDirSync(appDir)

    const postReceiveHook =
      `git --work-tree=${appDir} --git-dir=${this.reposDir.name}/${repo} checkout -f`

    execSync(postReceiveHook, {stdio: 'inherit'})
  }
}
