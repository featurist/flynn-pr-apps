const express = require('express')

module.exports = function () {
  const app = express()
  app.post('/deployments', ({body}, res) => {
    app.currentDeployment = {
      ref: body.deployment.ref
    }
    res.status(200).end()
  })
  return app
}
