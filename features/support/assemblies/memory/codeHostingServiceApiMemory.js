async function simulateAsync () {
  return new Promise((resolve, reject) => {
    setTimeout(resolve)
  })
}

module.exports = class CodeHostingServiceApiMemory {
  constructor ({deploymentStatusEvents, contextDebug = require('debug')}) {
    this.deploymentStatusEvents = deploymentStatusEvents
    this.debug = contextDebug('pr-apps:test:codeHostingServiceApiMemory')
  }

  async createDeployment (branch) {
    await simulateAsync()
    this.debug('Creating deployment for branch %s', branch)
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
    this.debug('Updating deployment status %o', update)
    this.deploymentStatusEvents.push(update)
  }
}
