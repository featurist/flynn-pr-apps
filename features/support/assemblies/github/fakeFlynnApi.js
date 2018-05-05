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
const FlynnApp = require('../memory/flynnApp')

let idSeq = 87

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
    this.apps = new Set()
    this.providers = []
    this.fs = new FsAdapter()

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
      this.createApp(req.body.name).then(({app}) => {
        res.status(201).send({id: app.id})
      }).catch(e => {
        console.error(e.stack)
        res.status(500).end()
      })
    })

    this.flynnController.get('/apps', (req, res) => {
      res.send(Array.from(this.apps))
    })

    this.flynnController.get('/apps/:appName', (req, res) => {
      const {id} = this.findAppByName(req.params.appName)
      res.send({id})
    })

    this.flynnController.delete('/apps/:appId', (req, res) => {
      try {
        const app = this._getApp(req.params.appId)
        debug('Destroying app %s', app.name)
        this._destroyAppRepo(app.name)
        this._removeAppWebLocation(app.name)
        delete this.apps.delete(app)
        res.status(200).end()
      } catch (e) {
        console.error(e.stack)
        res.status(500).end()
      }
    })

    this.flynnController.get('/apps/:appId/release', (req, res) => {
      const app = this._getApp(req.params.appId)
      if (app.release.id) {
        res.send(app.release)
      } else {
        res.status(404).end()
      }
    })

    this.flynnController.post('/releases', (req, res) => {
      const app = this._getApp(req.body.app_id)
      const release = {
        id: idSeq++,
        env: req.body.env,
        appName: app.name
      }
      if (req.body.processes) {
        release.processes = req.body.processes
      }
      app.release = release
      res.status(201).send(release)
    })

    this.flynnController.post('/apps/:appId/deploy', (req, res) => {
      const app = this._getApp(req.params.appId)
      const deploy = {
        appName: app.name,
        release: app.release
      }
      app.deploys.push(clone(deploy))
      res.status(201).end()
    })

    this.flynnController.get('/apps/:appId/routes', (req, res) => {
      const app = this._getApp(req.params.appId)
      res.send(app.routes)
    })

    this.flynnController.post('/apps/:appId/routes', (req, res) => {
      const app = this._getApp(req.params.appId)
      app.routes.push(req.body)
      res.status(201).end()
    })

    this.flynnController.put('/apps/:appId/scale/:releaseId', (req, res) => {
      const app = this._getApp(req.params.appId)
      expect(Number(req.params.releaseId)).to.eq(app.release.id)
      app.scale = req.body.new_processes
      res.status(200).end()
    })

    this.flynnController.get('/apps/:appId/resources', (req, res) => {
      const app = this._getApp(req.params.appId)
      res.send(app.resources)
    })

    this.flynnController.get('/providers/:id', (req, res) => {
      res.send(this.providers.find(p => p.id === Number(req.params.id)))
    })

    this.flynnController.post('/providers/:provider/resources', (req, res) => {
      const provider = req.params.provider
      const firstApp = this.firstApp()

      const apps = req.body.apps.map(id =>
        firstApp.id === id ? firstApp.name : null
      ).filter(_ => _)

      const resource = {
        providerName: req.params.provider,
        apps,
        env: resourceEnv(provider)
      }
      firstApp.resources.push(resource)
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
    const app = this.firstApp()
    if (app) {
      const repoDir = `${this.reposDir}/${app.name}.git`
      const appDir = `${this.appsDir}/${app.name}`

      if (fs.existsSync(repoDir)) {
        writePreReceiveHook({repoDir, appDir, broken: this.nextDeployShouldFail})
      }
    }
  }

  async createApp (name) {
    debug('Creating app %s', name)
    const repoDir = await this._createAppRepo(name)
    const app = new FlynnApp({name})
    this.apps.add(app)
    return {
      gitUrl: `file://${repoDir}`,
      app
    }
  }

  async addResources (app, resources) {
    debug('Adding initial resources %o', resources)
    resources.forEach(r => {
      const providerId = idSeq++
      app.release.id = 1
      this.providers.push({name: r, id: providerId})
      app.resources.push({
        apps: [app.name],
        provider: providerId,
        providerName: r,
        env: resourceEnv(r)
      })
    })
  }

  addEnv (app, env) {
    debug('Setting initial env %o', env)
    app.release.id = 1
    Object.assign(app.release.env, env)
  }

  firstApp () {
    return Array.from(this.apps)[0]
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

  findAppByName (appName) {
    return Array.from(this.apps).find(({name}) => name === appName)
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

  _getApp (appId) {
    return Array.from(this.apps).find(({id}) => id === Number(appId))
  }
}
