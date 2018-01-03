const express = require('express')
const fs = require('fs-extra')
const https = require('https')
const subdomain = require('express-subdomain')
const createFlynnGitReceiveApp = require('./flynnGitReceiveApp')
const bodyParser = require('body-parser')
const basicauth = require('basicauth-middleware')
const morgan = require('morgan')
const debug = require('debug')('pr-apps:fakeFlynnApi')
const FsAdapter = require('../../../../lib/fsAdapter')
const ShellAdapter = require('../../../../lib/shellAdapter')

function createPreReceiveHook (appDir) {
  return `
#!/bin/bash

while read oldrev newrev refname
do
  git archive $newrev | tar -x -C ${appDir}
done
`
}

module.exports = class FakeFlynnApi {
  constructor ({authKey, port}) {
    this.authKey = authKey
    this.port = port
    this.apps = {}
    this.releases = {}
    this.deploys = []
    this.fs = new FsAdapter()
  }

  async start () {
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

    let appId = 10
    flynnController.post('/apps', (req, res) => {
      this._createAppRepo(req.body.name).then(() => {
        debug('Creating app %s', req.body.name)
        this.apps[++appId] = req.body.name
        res.status(201).send({id: appId})
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

    flynnController.delete('/apps/:appId', (req, res) => {
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

    const releaseId = 865
    flynnController.get('/apps/:appId/release', (req, res) => {
      if (this.release) {
        res.send({id: releaseId})
      } else {
        res.status(404).end()
      }
    })

    flynnController.post('/releases', (req, res) => {
      this.release = req.body
      res.status(201).send({id: releaseId})
    })

    flynnController.post('/apps/:appId/deploy', (req, res) => {
      this.deploy = {
        appName: this.apps[Number(req.params.appId)],
        release: this.release
      }
      res.status(201).end()
    })

    flynnController.get('/apps/:appId/routes', (req, res) => {
      res.send([{
        service: 'web'
      }])
    })

    flynnController.post('/apps/:appId/routes', (req, res) => {
      this.extraRoutes = req.body
      res.status(201).end()
    })

    flynnController.put('/apps/:appId/scale/:releaseId', (req, res) => {
      this.scale = req.body.new_processes
      res.status(200).end()
    })

    const flynnGitReceive = createFlynnGitReceiveApp({
      reposDir: this.reposDir
    })
    flynnGitReceive.use(basicAuth)

    deployedApps.get('/', (req, res) => {
      const appName = req.subdomains[1]
      const appIndex = `${this.appsDir}/${appName}/index.html`
      if (fs.existsSync(appIndex)) {
        debug('Browsing deployed app %s', appIndex)
        res.sendFile(appIndex)
      } else {
        debug('Deployed app %s not found', appIndex)
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
    await new Promise(resolve => this.appServer.close(resolve))
  }

  failNextDeploy () {
    this.nextDeployShouldFail = true
  }

  async _createAppRepo (appName) {
    const repoDir = `${this.reposDir}/${appName}.git`
    fs.ensureDirSync(repoDir)

    const sh = new ShellAdapter({cwd: repoDir})
    await sh('git init --bare')

    const appDir = `${this.appsDir}/${appName}`
    fs.ensureDirSync(appDir)

    const preReceiveHook = this.nextDeployShouldFail
      ? '#!/bin/sh\necho "Deploy failed" && exit 1'
      : createPreReceiveHook(appDir)

    fs.writeFileSync(`${repoDir}/hooks/pre-receive`, preReceiveHook, {
      mode: '777'
    })
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
