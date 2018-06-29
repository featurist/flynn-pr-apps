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

  findPending (prNumber) {
    return Object.values(this.store).find(d => {
      return d.prNumber === prNumber && d.status === 'pending'
    })
  }

  deleteAppDeployments (prNumber) {
    Object.entries(this.store).forEach(([id, d]) => {
      if (d.prNumber === prNumber) {
        delete this.store[id]
      }
    })
  }
}
