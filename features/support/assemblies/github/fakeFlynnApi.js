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
  constructor ({authKey, port, clusterDomain, useSsl = true}) {
    this.authKey = authKey
    this.port = port
    this.useSsl = useSsl
    this.clusterDomain = clusterDomain
    this.providerId = 40
    this.apps = {}
    this.releases = {}
    this.deploys = []
    this.fs = new FsAdapter()
    this.appId = 10
    this.release = {env: {}}
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

    flynnController.post('/apps', (req, res) => {
      this.createApp(req.body.name).then(() => {
        res.status(201).send({id: this.appId})
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

    flynnController.get('/apps/:appName', (req, res) => {
      res.send(Object.entries(this.apps).reduce((result, [id, name]) => {
        if (req.params.appName === name) {
          result.id = id
        }
        return result
      }, {}))
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

    const releaseId = '865'
    flynnController.get('/apps/:appId/release', (req, res) => {
      if (this.release.id) {
        res.send({id: this.release.id})
      } else {
        res.status(404).end()
      }
    })

    flynnController.post('/releases', (req, res) => {
      Object.assign(this.release.env, req.body.env)
      this.release.id = releaseId
      this.release.appName = this.apps[Number(req.body.app_id)]
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

    this.resources = []
    flynnController.get('/apps/:appId/resources', (req, res) => {
      res.send(this.resources)
    })

    this.providers = []
    flynnController.get('/providers/:id', (req, res) => {
      res.send(this.providers.find(p => p.id === Number(req.params.id)))
    })

    flynnController.post('/providers/:provider/resources', (req, res) => {
      const provider = req.params.provider
      this._setResourceEnv(provider)
      this.resources.push({
        providerName: req.params.provider,
        apps: req.body.apps.map(id => this.apps[Number(id)])
      })
      res.status(201).end()
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

    if (this.useSsl) {
      const key = fs.readFileSync(`${__dirname}/server.key`, 'utf8')
      const cert = fs.readFileSync(`${__dirname}/server.crt`, 'utf8')

      this.appServer = https.createServer({key, cert}, app)
        .listen(this.port)
    } else {
      this.appServer = app.listen(this.port)
    }
  }

  async stop () {
    this.fs.rmRf(this.reposDir)
    this.fs.rmRf(this.appsDir)
    await new Promise(resolve => this.appServer.close(resolve))
  }

  failNextDeploy () {
    this.nextDeployShouldFail = true
  }

  async createApp (name) {
    debug('Creating app %s', name)
    const repoDir = await this._createAppRepo(name)
    this.apps[++this.appId] = name
    this.appName = name
    return {
      gitUrl: `file://${repoDir}`
    }
  }

  async addResources (resources) {
    debug('Adding resources %o', resources)
    resources.forEach(r => {
      const providerId = ++this.providerId
      this._setResourceEnv(r)
      this.providers.push({name: r, id: providerId})
      this.resources.push({
        apps: [this.appName],
        provider: providerId,
        providerName: r
      })
    })
  }

  addEnv (env) {
    Object.assign(this.release.env, env)
  }

  _setResourceEnv (resource) {
    Object.assign(this.release.env, {[`${resource.toUpperCase()}_URL`]: `${resource}://stuff`})
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
