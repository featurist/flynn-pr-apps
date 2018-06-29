const debug = require('debug')('pr-apps:workQueue')

let idSeq = 111

module.exports = class WorkQueue {
  constructor ({timeout = 60000} = {}) {
    this.timeout = timeout
  }

  addTask (fn, {delayed} = {}) {
    const id = idSeq++
    setTimeout(() => {
      debug(`Processing${delayed ? ' delayed' : ''} task #${id}`)
      fn()
        .then(() => debug(`Completed task #${id}`))
        .catch(e => console.error(e))
    }, delayed ? this.timeout : 0)
  }
}
