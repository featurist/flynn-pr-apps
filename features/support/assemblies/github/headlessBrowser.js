const Browser = require('zombie')

module.exports = class HeadlessBrowser {
  constructor () {
    this.browser = new Browser()
  }

  async visit (url) {
    await this.browser.visit(url)
    return this
  }

  text (selector) {
    return this.browser.text(selector)
  }

  async clickButton (text) {
    await this.browser.pressButton(text)
  }

  attribute (selector, name) {
    this.browser.assert.element(selector)
    const [element] = this.browser.queryAll(selector)
    return element.getAttribute(name)
  }
}
