const express = require('express')
const path = require('path')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const debug = require('debug')('pr-apps:web')
const GithubApiAdapter = require('./lib/githubApiAdapter')
const PrApps = require('./lib/prApps')
const GitProject = require('./lib/gitProject')
const FlynnApiClient = require('./lib/flynnApiClient')
const DeploymentRepo = require('./lib/deploymentRepo')
const db = require('./db/models')
const FsAdapter = require('./lib/fsAdapter')
const GitAdapter = require('./lib/gitAdapter')
const ConfigLoader = require('./lib/configLoader')
const {renderDeployment} = require('./lib/views')

function handleErrors (fn) {
  return function (req, res, next) {
    return Promise.resolve(fn(req, res)).then(() => {
      next()
    }).catch(e => {
      console.error(e.stack)
      next(e)
    })
  }
}

function verifySignature (secret) {
  return function (req, res, next) {
    const shasum = crypto.createHmac('sha1', secret)
      .update(JSON.stringify(req.body))

    const signature = Buffer.from('sha1=' + shasum.digest('hex'))
    if (crypto.timingSafeEqual(signature, Buffer.from(req.get('X-Hub-Signature')))) {
      next()
    } else {
      res.status(500).send('Github webhook signature is incorrect')
    }
  }
}

function setContext (req, res, next) {
  req.context = {
    eventType: req.get('X-GitHub-Event')
  }
  next()
}

function skipIrrelevantHooks (req, res, next) {
  const eventType = req.context.eventType

  if (eventType === 'pull_request') {
    debug('Processing %s event', eventType)
    next()
  } else {
    debug('Skipping %s event', eventType)
    res.status(202).send(`Skipping ${eventType} event`)
  }
}

module.exports = function ({prApps, webhookSecret}) {
  const app = express()

  if (debug.enabled) {
    app.use(morgan('dev'))
  }
  app.use(bodyParser.json())

  app.post('/webhook',
    setContext,
    skipIrrelevantHooks,
    verifySignature(webhookSecret),
    handleErrors(async (req, res) => {
      const {
        action,
        number,
        pull_request: {
          head: {
            ref: branch,
            sha: version
          }
        }
      } = req.body

      debug('pull_request action', action)

      if (action === 'opened' || action === 'reopened') {
        debug('Initiating new deploy')
        res.status(200).send('Initiating new deploy')
        await prApps.deployPullRequest({branch, prNumber: number, version})
      } else if (action === 'synchronize') {
        debug('Initiating deploy update')
        res.status(200).send('Initiating deploy update')
        await prApps.deployUpdate({branch, prNumber: number, version})
      } else if (action === 'closed') {
        debug('Initiating app destroy')
        res.status(200).send('Initiating app destroy')
        await prApps.destroyPrApp(number)
      } else {
        debug(`Skipping pull_request action ${action}`)
        res.status(202).send(`Skipping pull_request action ${action}`)
      }
    }))

  app.get('/deployments/:deploymentId', handleErrors(async (req, res) => {
    res.set({'content-type': 'text/html'})

    const deployment = await prApps.getDeployment(req.params.deploymentId)
    if (deployment) {
      res.send(renderDeployment(deployment))
    } else {
      res.status(404).end()
    }
  }))

  app.get('/style.css', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'browser', 'style.css'))
  })

  return app
}

if (!module.parent) {
  const fs = new FsAdapter()
  const git = new GitAdapter({fs})

  const scmProject = new GitProject({
    token: process.env.GH_USER_TOKEN,
    remoteUrl: process.env.GH_REPO,
    git
  })
  const codeHostingServiceApi = new GithubApiAdapter({
    token: process.env.GH_USER_TOKEN,
    repo: process.env.GH_REPO
  })

  const flynnApiClientFactory = (clusterDomain) => {
    return new FlynnApiClient({
      authKey: process.env.FLYNN_AUTH_KEY,
      clusterDomain
    })
  }

  const deploymentRepo = new DeploymentRepo(db)

  const prApps = new PrApps({
    codeHostingServiceApi,
    scmProject,
    flynnApiClientFactory,
    deploymentRepo,
    appInfo: require('./appInfo.json'),
    configLoader: new ConfigLoader()
  })
  const port = process.env.PORT || 5599
  module.exports({prApps, webhookSecret: process.env.WEBHOOK_SECRET}).listen(port, function () {
    console.info('pr-apps is listening on %s', port)
  })
}
