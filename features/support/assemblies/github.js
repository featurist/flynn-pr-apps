const {promisify} = require('util')
const fs = require('fs')
const path = require('path')
const simpleGit = require('simple-git/promise')
const GitHubApi = require('github')
const tmp = require('tmp')
const ngrok = require('ngrok')

const testGhRepoUrl = `https://${process.env.TEST_GH_USER_TOKEN}@github.com/${process.env.TEST_GH_REPO}.git`

module.exports = class GithubAssembly {
  constructor () {
    this.repo = new GitRepo()
    this.codeHostingService = new GithubService()
  }

  async setup () {
    await this.codeHostingService.deleteNonMasterBranches()
    await this.codeHostingService.deleteWebhooks()
    const prAppsHost = await promisify(ngrok.connect)(9874)
    await this.codeHostingService.createWebhook(`${prAppsHost}/payload`)
  }

  async start () {
    await this.repo.create()
  }

  async stop () {
    await this.repo.destroy()
  }

  createActor () {
    // return new HumanActor({repo, codeHostingService})
    return new HumanActor({repo: this.repo})
  }
}

class GithubService {
  constructor () {
    [this.owner, this.repo] = process.env.TEST_GH_REPO.split('/')
    this.ghApi = new GitHubApi()
    this.ghApi.authenticate({
      type: 'token',
      token: process.env.TEST_GH_USER_TOKEN
    })
  }

  async createWebhook (url) {
    await this.ghApi.repos.createHook({
      owner: this.owner,
      repo: this.repo,
      name: 'web',
      events: ['push', 'pull_request'],
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
