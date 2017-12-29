const express = require('express')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const debug = require('debug')('pr-apps:web')
const GithubApiAdapter = require('./lib/githubApiAdapter')
const PrApps = require('./lib/prApps')
const GitProject = require('./lib/gitProject')
const FlynnService = require('./lib/flynnService')
const FsAdapter = require('./lib/fsAdapter')
const GitAdapter = require('./lib/gitAdapter')

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
            ref: branch
          }
        }
      } = req.body

      debug('pull_request action', action)

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
  const flynnService = new FlynnService({
    authKey: process.env.FLYNN_AUTH_KEY,
    clusterDomain: process.env.FLYNN_CLUSTER_DOMAIN
  })

  const prApps = new PrApps({
    codeHostingServiceApi,
    scmProject,
    flynnService
  })
  const port = process.env.PORT
  module.exports({prApps, webhookSecret: process.env.WEBHOOK_SECRET}).listen(port, function () {
    console.info('pr-apps is listening on %s', port)
  })
}
