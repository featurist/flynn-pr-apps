const express = require('express')
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
      next(req, res)
    }).catch(e => {
      console.error(e.stack)
      next(req, res, e)
    })
  }
}

module.exports = function (prApps) {
  const app = express()

  app.use(bodyParser.json())
  if (debug.enabled) {
    app.use(morgan('dev'))
  }

  app.post('/webhook', handleErrors(async (req, res) => {
    const eventType = req.get('X-GitHub-Event')
    debug('eventType %s', eventType)

    if (eventType === 'pull_request') {
      const {
        head: {
          ref: branch
        },
        number: prNumber
      } = req.body.pull_request

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
  module.exports(prApps).listen(process.env.PORT || 9891)
}
