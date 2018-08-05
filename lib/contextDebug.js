const crypto = require('crypto')
const debug = require('debug')

module.exports = class ContextDebug extends Function {
  constructor () {
    const contextId = crypto.randomBytes(20).toString('hex')

    function contextDebug (prefix) {
      const log = debug(prefix)

      return function (...args) {
        const message = `[${contextId}] ${args.shift()}`
        log(message, ...args)
      }
    }
    Object.setPrototypeOf(contextDebug, ContextDebug.prototype)
    return contextDebug
  }
}
