const express = require('express')
const {expect} = require('chai')
const fs = require('fs-extra')
const createFlynnGitReceiveApp = require('./flynnGitReceiveApp')
const bodyParser = require('body-parser')
const basicauth = require('basicauth-middleware')
const morgan = require('morgan')
const debug = require('debug')('pr-apps:test:fakeFlynnApi')
const FsAdapter = require('../../../../lib/fsAdapter')
const ShellAdapter = require('../../../../lib/shellAdapter')
const clone = require('../../../../lib/clone')

function writePreReceiveHook ({appDir, repoDir, broken}) {
  const maybeSleep = process.env.SLOW_DOWN_DEPLOY ? 'sleep 1' : ''
  const preReceiveHook = broken
    ? `#!/bin/sh\necho "Deploy failed"\n${maybeSleep}\nexit 1`
    : createPreReceiveHook(appDir, maybeSleep)

  fs.writeFileSync(`${repoDir}/hooks/pre-receive`, preReceiveHook, {
    mode: '777'
  })
}

function createPreReceiveHook (appDir, maybeSleep) {
  return `
#!/bin/bash

${maybeSleep}

while read oldrev newrev refname
do
  git archive $newrev | tar -x -C ${appDir}
done
`
}

function resourceEnv (resource) {
  return {[`${resource.toUpperCase()}_URL`]: `${resource}://stuff`}
}

module.exports = class FakeFlynnApi {
  constructor ({authKey, clusterDomain}) {
    this.authKey = authKey
    this.clusterDomain = clusterDomain
    this.providerId = 40
    this.deploys = []
    this.fs = new FsAdapter()
    this.release = {
      id: 0,
      env: {}
    }

    this.reposDir = this.fs.makeTempDir()
    this.appsDir = this.fs.makeTempDir()

    this.deployedApps = express()
    this.flynnController = express()

    const basicAuth = basicauth(
      '',
      this.authKey,
      'Fake Flynn needs basic auth'
    )

    this.flynnController.use(bodyParser.json())
    this.flynnController.use(basicAuth)

    this.flynnController.post('/apps', (req, res) => {
      this.createApp(req.body.name).then(() => {
        res.status(201).send({id: this.app.id})
      }).catch(e => {
        console.error(e.stack)
        res.status(500).end()
      })
    })

    this.flynnController.get('/apps', (req, res) => {
      res.send([this.app])
    })

    this.flynnController.get('/apps/:appName', (req, res) => {
      res.send({id: this.app.id})
    })

    this.flynnController.delete('/apps/:appId', (req, res) => {
      try {
        expect(req.params.appId).to.eq(this.app.id)
        const appName = this.app.name
        debug('Destroying app %s', appName)
        delete this.app
        this._destroyAppRepo(appName)
        this._removeAppWebLocation(appName)
        res.status(200).end()
      } catch (e) {
        console.error(e.stack)
        res.status(500).end()
      }
    })

    this.flynnController.get('/apps/:appId/release', (req, res) => {
      if (this.release.id) {
        res.send(this.release)
      } else {
        res.status(404).end()
      }
    })

    this.flynnController.post('/releases', (req, res) => {
      expect(req.body.app_id).to.eq(this.app.id)
      this.release.id++
      this.release.env = req.body.env
      this.release.appName = this.app.name
      if (req.body.processes) {
        this.release.processes = req.body.processes
      }
      res.status(201).send(this.release)
    })

    this.flynnController.post('/apps/:appId/deploy', (req, res) => {
      expect(req.params.appId).to.eq(this.app.id)
      this.lastDeploy = {
        appName: this.app.name,
        release: this.release
      }
      this.deploys.push(clone(this.lastDeploy))
      // slugbuilder bump deploy does not set version
      if (this.release.env) {
        this.appVersion = this.release.env.VERSION
      }
      res.status(201).end()
    })

    this.flynnController.get('/apps/:appId/routes', (req, res) => {
      expect(req.params.appId).to.eq(this.app.id)
      res.send([{
        service: 'web'
      }])
    })

    this.flynnController.post('/apps/:appId/routes', (req, res) => {
      expect(req.params.appId).to.eq(this.app.id)
      this.extraRoutes = req.body
      res.status(201).end()
    })

    this.flynnController.put('/apps/:appId/scale/:releaseId', (req, res) => {
      expect(req.params.appId).to.eq(this.app.id)
      expect(Number(req.params.releaseId)).to.eq(this.release.id)
      this.scale = req.body.new_processes
      res.status(200).end()
    })

    this.resources = []
    this.flynnController.get('/apps/:appId/resources', (req, res) => {
      expect(req.params.appId).to.eq(this.app.id)
      res.send(this.resources)
    })

    this.providers = []
    this.flynnController.get('/providers/:id', (req, res) => {
      res.send(this.providers.find(p => p.id === Number(req.params.id)))
    })

    this.flynnController.post('/providers/:provider/resources', (req, res) => {
      const provider = req.params.provider
      const resource = {
        providerName: req.params.provider,
        apps: req.body.apps.map(id => this.app.id === id ? this.app.name : null).filter(_ => _),
        env: resourceEnv(provider)
      }
      this.resources.push(resource)
      res.status(201).send(resource)
    })

    this.flynnGitReceive = createFlynnGitReceiveApp({
      reposDir: this.reposDir
    })
    this.flynnGitReceive.use(basicAuth)

    this.deployedApps.get('/', (req, res) => {
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

    if (debug.enabled) {
      this.deployedApps.use(morgan('dev'))
      this.flynnController.use(morgan('dev'))
      this.flynnGitReceive.use(morgan('dev'))
    }
  }

  async stop () {
    this.fs.rmRf(this.reposDir)
    this.fs.rmRf(this.appsDir)
  }

  failNextDeploy () {
    this.nextDeployShouldFail = true
    if (this.app) {
      const repoDir = `${this.reposDir}/${this.app.name}.git`
      const appDir = `${this.appsDir}/${this.app.name}`

      if (fs.existsSync(repoDir)) {
        writePreReceiveHook({repoDir, appDir, broken: this.nextDeployShouldFail})
      }
    }
  }

  async createApp (name) {
    debug('Creating app %s', name)
    const repoDir = await this._createAppRepo(name)
    this.app = {
      id: 'someAppId',
      name
    }
    return {
      gitUrl: `file://${repoDir}`
    }
  }

  async addResources (resources) {
    debug('Adding initial resources %o', resources)
    resources.forEach(r => {
      const providerId = ++this.providerId
      this.release.id = 1
      this.providers.push({name: r, id: providerId})
      this.resources.push({
        apps: [this.app.name],
        provider: providerId,
        providerName: r,
        env: resourceEnv(r)
      })
    })
  }

  addEnv (env) {
    debug('Setting initial env %o', env)
    this.release.id = 1
    Object.assign(this.release.env, env)
    this.appVersion = this.release.env.VERSION
  }

  async _createAppRepo (appName) {
    const repoDir = `${this.reposDir}/${appName}.git`
    fs.ensureDirSync(repoDir)

    const sh = new ShellAdapter({cwd: repoDir})
    await sh('git init --bare')

    const appDir = `${this.appsDir}/${appName}`
    fs.ensureDirSync(appDir)

    writePreReceiveHook({repoDir, appDir, broken: this.nextDeployShouldFail})
    return repoDir
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
