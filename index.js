if (process.env.NEWRELIC_KEY) {
  require('newrelic')
}
const express = require('express')
const path = require('path')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const morgan = require('morgan')
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
const WorkQueue = require('./lib/workQueue')
const ContextDebug = require('./lib/contextDebug')

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

function skipIrrelevantHooks (req, res, next) {
  const eventType = req.context.eventType
  const debug = req.context.debug

  if (eventType === 'pull_request') {
    debug('Processing %s event', eventType)
    next()
  } else {
    debug('Skipping %s event', eventType)
    res.status(202).send(`Skipping ${eventType} event`)
  }
}

module.exports = function ({createPrApps, webhookSecret}) {
  function setContext (req, res, next) {
    const contextDebug = new ContextDebug()
    req.context = {
      eventType: req.get('X-GitHub-Event'),
      prApps: createPrApps(contextDebug),
      debug: contextDebug('pr-apps:web')
    }
    next()
  }

  const app = express()

  app.use(morgan('dev'))
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
            ref: branch
          }
        }
      } = req.body

      const debug = req.context.debug
      debug('pull_request action', action)

      const prApps = req.context.prApps

      if (action === 'opened' || action === 'reopened') {
        debug('Initiating new deploy')
        res.status(200).send('Initiating new deploy')
        await prApps.deployPullRequest({branch, prNumber: number})
      } else if (action === 'synchronize') {
        debug('Initiating deploy update')
        res.status(200).send('Initiating deploy update')
        await prApps.deployUpdate({branch, prNumber: number})
      } else if (action === 'closed') {
        debug('Initiating app destroy')
        res.status(200).send('Initiating app destroy')
        await prApps.destroyPrApp(number)
      } else {
        debug(`Skipping pull_request action ${action}`)
        res.status(202).send(`Skipping pull_request action ${action}`)
      }
    }))

  app.get('/deployments/:deploymentId', setContext, handleErrors(async (req, res) => {
    res.type('html')

    const deployment = await req.context.prApps.getDeployment(req.params.deploymentId)
    if (deployment) {
      res.send(renderDeployment(deployment))
    } else {
      res.status(404).end()
    }
  }))

  app.post('/deployments/:deploymentId/redeploy', setContext, handleErrors(async (req, res) => {
    const deployment = await req.context.prApps.getDeployment(req.params.deploymentId)
    const newDeployment = await req.context.prApps.deployUpdate(deployment)
    res.redirect(`/deployments/${newDeployment.id}`)
  }))

  app.get('/style.css', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'browser', 'style.css'))
  })

  return app
}

if (!module.parent) {
  const createPrApps = (contextDebug) => {
    const fs = new FsAdapter({contextDebug})
    const git = new GitAdapter({fs, contextDebug})

    const scmProject = new GitProject({
      token: process.env.GH_USER_TOKEN,
      remoteUrl: process.env.GH_REPO,
      git
    })
    const codeHostingServiceApi = new GithubApiAdapter({
      token: process.env.GH_USER_TOKEN,
      repo: process.env.GH_REPO,
      contextDebug
    })

    const flynnApiClientFactory = (clusterDomain) => {
      return new FlynnApiClient({
        authKey: process.env.FLYNN_AUTH_KEY,
        clusterDomain,
        contextDebug
      })
    }

    const deploymentRepo = new DeploymentRepo(db)

    return new PrApps({
      contextDebug,
      codeHostingServiceApi,
      scmProject,
      flynnApiClientFactory,
      deploymentRepo,
      workQueue: new WorkQueue({contextDebug}),
      appInfo: require('./appInfo.json')[0],
      configLoader: new ConfigLoader({contextDebug})
    })
  }
  const port = process.env.PORT || 5599

  module.exports({createPrApps, webhookSecret: process.env.WEBHOOK_SECRET}).listen(port, function () {
    console.info('pr-apps is listening on %s', port)
  })
}
