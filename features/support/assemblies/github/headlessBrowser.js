const httpism = require('httpism')
const cheerio = require('cheerio')

module.exports = class HeadlessBrowser {
  async visit (url, options = {}) {
    const res = await httpism.get(url, options)
    if (options.response) {
      return res
    } else {
      return cheerio.load(res)
    }
  }
}
