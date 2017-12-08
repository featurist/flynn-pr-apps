const express = require('express')

module.exports = function () {
  const app = express()
  app.deploymentStatusEvents = []

  app.post('/deployments_test', ({body}, res) => {
    app.deploymentStatusEvents.push({
      ref: body.deployment.ref,
      state: body.deployment_status.state
    })
    res.status(200).end()
  })
  return app
}
