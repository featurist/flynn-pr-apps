const httpism = require('httpism')

module.exports = class HeadlessBrowser {
  visit (url) {
    return httpism.get(url)
  }
}
