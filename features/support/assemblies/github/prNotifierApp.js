const express = require('express')
const debug = require('debug')('pr-apps:test:prNotifierApp')

module.exports = function ({ghApi}) {
  const app = express()
  app.deploymentStatusEvents = []

  app.post('/deployments_test', ({body}, res) => {
    ghApi.getDeploymentStatus({
      id: body.deployment.id,
      status_id: body.deployment_status.id
    }).then(({log_url: flynnAppUrl, environment_url: deployedAppUrl}) => {
      const event = {
        branch: body.deployment.ref,
        status: body.deployment_status.state,
        flynnAppUrl,
        deployedAppUrl
      }
      debug('Github event received %o', event)
      app.deploymentStatusEvents.push(event)
      res.status(200).end()
    }).catch(e => {
      console.error(e)
      res.status(500).end()
    })
  })
  return app
}
