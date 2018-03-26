module.exports = class DeploymentRepoMemory {
  constructor () {
    this.store = {}
    this.idSeq = 459
  }

  create (params) {
    const id = (this.idSeq++).toString()
    const newDeployment = Object.assign({id, logs: []}, params)
    this.store[id] = newDeployment
    return newDeployment
  }

  appendLog ({id}, line) {
    this.store[id].logs.push(line)
  }

  get (id) {
    return this.store[id]
  }

  save (deployment) {
    this.store[deployment.id] = deployment
  }

  deleteAppDeployments (appName) {
    Object.entries(this.store).forEach(([id, d]) => {
      if (d.appName === appName) {
        delete this.store[id]
      }
    })
  }
}
