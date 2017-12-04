const {promisify} = require('util')
const fs = require('fs')
const path = require('path')
const simpleGit = require('simple-git/promise')
const GitHubApi = require('github')
const tmp = require('tmp')
const ngrok = require('ngrok')
const retry = require('trytryagain')
const {expect} = require('chai')
const express = require('express')
const createPrApps = require('../../..')

const testGhRepoUrl = `https://${process.env.TEST_GH_USER_TOKEN}@github.com/${process.env.TEST_GH_REPO}.git`

function createPrNotifier () {
  const app = express()
  app.post('/deployments', ({body}, res) => {
    app.currentDeployment = {
      ref: body.deployment.ref
    }
    res.status(200).end()
  })
  return app
}

module.exports = class GithubAssembly {
  async setup () {
    this.prAppsHost = await promisify(ngrok.connect)(9874)
  }

  async start () {
    this.prApps = createPrApps()
    this.prNotifier = createPrNotifier()
    this.prApps.use(this.prNotifier)
    this.prApps.listen(9874)

    this.repo = new GitRepo()
    this.codeHostingService = new GithubService({prNotifier: this.prNotifier})

    await Promise.all([
      this.codeHostingService.deleteWebhooks(),
      this.codeHostingService.closeAllPrs()
    ])
    await this.codeHostingService.deleteNonMasterBranches()

    await Promise.all([
      this.codeHostingService.createWebhook(`${this.prAppsHost}/webhook`, ['push', 'pull_request']),
      this.codeHostingService.createWebhook(`${this.prAppsHost}/deployments`, ['deployment', 'deployment_status']),
      this.repo.create()
    ])
  }

  async stop () {
    await Promise.all([
      this.repo.destroy(),
      promisify(this.prApps.close)()
    ])
  }

  createActor () {
    return new HumanActor({
      repo: this.repo,
      codeHostingService: this.codeHostingService
    })
  }
}

class GithubService {
  constructor ({prNotifier}) {
    [this.owner, this.repo] = process.env.TEST_GH_REPO.split('/')
    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token: process.env.TEST_GH_USER_TOKEN
    })
    this.prNotifier = prNotifier
  }

  async createWebhook (url, events) {
    await this.ghApi.repos.createHook({
      owner: this.owner,
      repo: this.repo,
      name: 'web',
      events,
      active: true,
      config: {
        url,
        content_type: 'json',
        insecure_ssl: '1'
      }
    })
  }

  async deleteNonMasterBranches () {
    const {data: branches} = await this.ghApi.repos.getBranches({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      branches.map(({name}) => {
        if (name === 'master') {
          return Promise.resolve()
        } else {
          return this.ghApi.gitdata.deleteReference({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${name}`
          })
        }
      })
    )
  }

  async closeAllPrs () {
    const {data: prs} = await this.ghApi.pullRequests.getAll({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      prs.map(pr => {
        return this.ghApi.pullRequests.update({
          owner: this.owner,
          repo: this.repo,
          number: pr.number,
          state: 'closed'
        })
      })
    )
  }

  async deleteWebhooks () {
    const {data: hooks} = await this.ghApi.repos.getHooks({
      owner: this.owner,
      repo: this.repo
    })
    return Promise.all(
      hooks.map(({id}) => {
        return this.ghApi.repos.deleteHook({
          owner: this.owner,
          repo: this.repo,
          id
        })
      })
    )
  }

  async openPullRequest (branch) {
    const {data: pr} = await this.ghApi.pullRequests.create({
      owner: this.owner,
      repo: this.repo,
      title: 'Adds Feature1',
      head: branch,
      base: 'master'
    })
    return new CurrentPrNotifier({prNotifier: this.prNotifier, pr})
  }
}

class CurrentPrNotifier {
  constructor ({prNotifier, pr}) {
    this.prNotifier = prNotifier
    this.pr = pr
  }

  async waitForDeployStarted () {
    await retry(async () => {
      const currentDeployment = this.prNotifier.currentDeployment
      expect(currentDeployment).to.not.be.undefined // eslint-disable-line no-unused-expressions
      expect(currentDeployment.ref).to.eq(this.pr.head.ref)
    }, 5000)
  }
}

class HumanActor {
  constructor ({repo, codeHostingService}) {
    this.codeHostingService = codeHostingService
    this.repo = repo
  }

  async start () {}

  async stop () {}

  async pushBranch () {
    this.currentBranch = await this.repo.pushBranch()
  }

  async openPullRequest () {
    this.currentPrNotifier = await this.codeHostingService.openPullRequest(this.currentBranch)
  }

  async shouldSeeDeployStarted () {
    await this.currentPrNotifier.waitForDeployStarted()
  }
}

class GitRepo {
  constructor () {
    this.featureBranch = 'Feature1'
  }

  async create () {
    this.tmpDir = tmp.dirSync({unsafeCleanup: true})
    this.git = simpleGit(this.tmpDir.name)
    await this.git.init()
    await this.git.addRemote('origin', testGhRepoUrl)
    await this.git.pull('origin', 'master')
  }

  async destroy () {
    return this.tmpDir.removeCallback()
  }

  async pushBranch () {
    await this.git.checkoutLocalBranch(this.featureBranch)
    fs.writeFileSync(path.join(this.tmpDir.name, 'index.js'), 'console.log(1)')
    await this.git.add('.')
    await this.git.commit('add index.js')
    await this.git.push(['--set-upstream', 'origin', this.featureBranch])
    return this.featureBranch
  }
}
