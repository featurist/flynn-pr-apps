const path = require('path')
const express = require('express')
const {spawn} = require('child_process')
const backend = require('git-http-backend')
const debug = require('debug')('pr-apps:flynnGitReceive')

module.exports = function ({reposDir}) {
  const app = express()

  app.use(function (req, res) {
    const repo = req.url.split('/')[1]
    const dir = path.join(reposDir, repo)

    req.pipe(backend(req.url, function (err, service) {
      if (err) return res.end(err + '\n')

      res.setHeader('content-type', service.type)
      debug(service.action, repo)

      const ps = spawn(service.cmd, service.args.concat(dir))
      ps.stdout.pipe(service.createStream()).pipe(ps.stdin)
    })).pipe(res)
  })

  return app
}
