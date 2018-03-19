let idSeq = 92

module.exports = class FlynnApp {
  constructor ({name}) {
    this.id = idSeq++
    this.name = name
    this.release = {env: {}}
    this.resources = []
    this.routes = [{
      service: 'web'
    }]
    this.deploys = []
  }

  lastDeploy () {
    return this.deploys[this.deploys.length - 1]
  }
}
