const express = require('express')
const crypto = require('crypto')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const debug = require('debug')('pr-apps:web')
const GithubApiAdapter = require('./lib/githubApiAdapter')
const PrApps = require('./lib/prApps')
const GitProject = require('./lib/gitProject')
const FlynnService = require('./lib/flynnService')

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
    res.status(200).end()
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
      const payload = req.body

      if (req.context.eventType === 'pull_request') {
        const {
          head: {
            ref: branch
          },
          number: prNumber
        } = payload.pull_request

        await prApps.deployPullRequest({branch, prNumber})
      }
      res.status(200).end()
    }))

  return app
}

if (!module.parent) {
  const codeHostingServiceApi = new GithubApiAdapter({
    token: process.env.GH_USER_TOKEN,
    repo: process.env.GH_REPO
  })
  const scmProject = new GitProject({
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
