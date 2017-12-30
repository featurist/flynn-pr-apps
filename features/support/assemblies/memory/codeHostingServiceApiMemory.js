const debug = require('debug')('pr-apps:codeHostingServiceApiMemory')

module.exports = class CodeHostingServiceApiMemory {
  constructor () {
    this.deploymentStatusEvents = []
  }

  async createDeployment (branch) {
    debug('Creating deployment for branch %s', branch)
    return {
      branch
    }
  }

  async updateDeploymentStatus (deployment, status, {deployedAppUrl, flynnAppUrl}) {
    const update = {
      branch: deployment.branch,
      status,
      deployedAppUrl,
      flynnAppUrl
    }
    debug('Updating deployment status %o', update)
    this.deploymentStatusEvents.push(update)
  }
}
