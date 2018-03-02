const httpism = require('httpism')
const cheerio = require('cheerio')

module.exports = class HeadlessBrowser {
  async visit (url) {
    const pageSource = await httpism.get(url)
    return cheerio.load(pageSource)
  }
}
