const express = require('express')
const bodyParser = require('body-parser')

module.exports = function () {
  const app = express()

  app.use(bodyParser.json())

  app.post('/payload', (req, res) => {
    res.status(200).end()
  })
  return app
}

if (!module.parent) {
  module.exports().listen(process.env.PORT || 9891)
}
