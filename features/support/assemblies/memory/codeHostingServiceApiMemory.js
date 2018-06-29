const debug = require('debug')('pr-apps:test:codeHostingServiceApiMemory')

async function simulateAsync () {
  return new Promise((resolve, reject) => {
    setTimeout(resolve)
  })
}

module.exports = class CodeHostingServiceApiMemory {
  constructor () {
    this.deploymentStatusEvents = []
  }

  async createDeployment (branch) {
    await simulateAsync()
    debug('Creating deployment for branch %s', branch)
    return {
      branch
    }
  }

  async updateDeploymentStatus (deployment, {status, deployedAppUrl, deploymentUrl}) {
    await simulateAsync()
    const update = {
      branch: deployment.branch,
      status,
      deployedAppUrl,
      deploymentUrl
    }
    debug('Updating deployment status %o', update)
    this.deploymentStatusEvents.push(update)
  }
}
