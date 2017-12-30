const httpism = require('httpism')
const crypto = require('crypto')

module.exports = class PrAppsWebClient {
  constructor (prAppsUrl, webhookSecret) {
    this.client = httpism.client(prAppsUrl, {
      headers: {'X-GitHub-Event': 'pull_request'}
    }, [
      function (req, next) {
        const shasum = crypto.createHmac('sha1', webhookSecret)
          .update(JSON.stringify(req.body))

        req.headers['X-Hub-Signature'] = 'sha1=' + shasum.digest('hex')
        return next()
      }
    ])
  }

  enable () {
    this.enabled = true
  }

  async post () {
    if (this.enabled) {
      await this.client.post(...arguments)
    }
  }
}
