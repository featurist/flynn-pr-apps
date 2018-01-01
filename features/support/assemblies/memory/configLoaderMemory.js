module.exports = class ConfigLoaderMemory {
  load () {
    return this.config
  }

  setConfig (config) {
    this.config = config
  }
}
