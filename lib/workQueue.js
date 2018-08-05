let idSeq = 111

module.exports = class WorkQueue {
  constructor ({timeout = 60000, contextDebug = require('debug')} = {}) {
    this.timeout = timeout
    this.debug = contextDebug('pr-apps:workQueue')
  }

  addTask (fn, {delayed} = {}) {
    const id = idSeq++
    setTimeout(() => {
      this.debug(`Processing${delayed ? ' delayed' : ''} task #${id}`)
      fn()
        .then(() => this.debug(`Completed${delayed ? ' delayed' : ''} task #${id}`))
        .catch(e => console.error(e))
    }, delayed ? this.timeout : 0)
  }
}
