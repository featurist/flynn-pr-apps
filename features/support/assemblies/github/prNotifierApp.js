const express = require('express')
const debug = require('debug')('pr-apps:test:prNotifierApp')

module.exports = function () {
  const app = express()
  app.deploymentStatusEvents = []

  app.post('/deployments_test', ({body}, res) => {
    const event = {
      branch: body.deployment.ref,
      status: body.deployment_status.state
    }
    debug('Github event received %o', event)
    app.deploymentStatusEvents.push(event)
    res.status(200).end()
  })
  return app
}
