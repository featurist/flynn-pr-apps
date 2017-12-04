const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const CodeHostingService = require('./lib/github')
const debug = require('debug')('pr-apps')

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

module.exports = function ({
  ghUserToken,
  ghRepo
}) {
  const app = express()
  const [owner, repo] = ghRepo.split('/')
  const codeHostingService = new CodeHostingService({
    token: ghUserToken,
    owner,
    repo
  })

  app.use(bodyParser.json())
  if (debug.enabled) {
    app.use(morgan('dev'))
  }

  app.post('/webhook', handleErrors(async (req, res) => {
    const eventType = req.get('X-GitHub-Event')
    debug('eventType %s', eventType)

    if (eventType === 'pull_request') {
      const branch = req.body.pull_request.head.ref
      await codeHostingService.createDeployment(branch)
    }
    res.status(200).end()
  }))

  return app
}

if (!module.parent) {
  module.exports().listen(process.env.PORT || 9891)
}
