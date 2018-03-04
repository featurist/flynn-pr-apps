module.exports = class DeploymentRepo {
  constructor (db) {
    this.db = db
    this.objectCache = {}
  }

  async create (params) {
    const deployment = await this.db.Deployment.create(params)
    this.objectCache[deployment.id] = deployment
    return deployment.toJSON()
  }

  async appendLog (deployment, text) {
    const model = this.objectCache[deployment.id]
    await model.createLogChunk({text})
  }

  async get (id) {
    const deployment = await this.db.Deployment.findById(id, {
      include: 'LogChunks',
      order: [['LogChunks', 'id']]
    })
    this.objectCache[deployment.id] = deployment
    return deployment.toJSON()
  }

  async save (deployment) {
    const model = this.objectCache[deployment.id]
    await model.update(deployment)
  }
}
