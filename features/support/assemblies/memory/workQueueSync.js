module.exports = class WorkQueueSync {
  async addTask (fn) {
    return fn()
  }
}
