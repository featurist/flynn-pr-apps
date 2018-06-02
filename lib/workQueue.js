module.exports = class WorkQueue {
  constructor () {
    this._queue = []
    setInterval(() => this._process(), 100)
  }

  async addTask (fn) {
    this._queue.push(fn)
  }

  async _process () {
    const taskFn = this._queue.shift()
    if (taskFn) {
      await taskFn()
    }
  }
}
