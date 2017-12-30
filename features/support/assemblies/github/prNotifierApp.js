const express = require('express')

module.exports = function () {
  const app = express()
  app.deploymentStatusEvents = []

  app.post('/deployments_test', ({body}, res) => {
    app.deploymentStatusEvents.push({
      branch: body.deployment.ref,
      status: body.deployment_status.state
    })
    res.status(200).end()
  })
  return app
}
