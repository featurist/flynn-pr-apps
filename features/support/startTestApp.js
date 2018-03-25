const https = require('https')
const express = require('express')
const fs = require('fs-extra')
const subdomain = require('express-subdomain')

module.exports = function ({prAppsApp, fakeFlynnApi, port}) {
  const app = express()

  app.use(subdomain('pr-apps.prs', prAppsApp))
  app.use(subdomain('controller.prs', fakeFlynnApi.flynnController))
  app.use(subdomain('git.prs', fakeFlynnApi.flynnGitReceive))
  app.use(subdomain('*.prs', fakeFlynnApi.deployedApps))

  const key = fs.readFileSync(`${__dirname}/server.key`, 'utf8')
  const cert = fs.readFileSync(`${__dirname}/server.crt`, 'utf8')

  return https.createServer({key, cert}, app)
    .listen(port)
}
