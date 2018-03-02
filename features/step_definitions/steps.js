const { Given, When, Then } = require('cucumber')

Given('{actor} pushed a branch to a code hosting service', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
})

When('{actor} opens a pull request for that branch', async function (actor) {
  await actor.openPullRequest()
})

Then('{actor} should see that deploy of a pr app has started', async function (actor) {
  await actor.shouldSeeDeployStarted()
})

Given('the deploy of {actor}\'s new pr app has started', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  await actor.openPullRequest()
  await actor.shouldSeeDeployStarted()
  this.currentActor = actor
})

When('the deploy is complete', async function () {
  await this.currentActor.shouldSeeDeployFinished()
})

Then('{actor} sees that the deploy is complete', async function (actor) {
  await actor.shouldSeeDeploySuccessful()
})

Given('{actor} received a notification that his pr app deploy is complete', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  await actor.openPullRequest()
  await actor.shouldSeeDeployStarted()
  await actor.shouldSeeDeploySuccessful()
})

When('{actor} follows the link in the notifiation', async function (actor) {
  await actor.followDeployedAppLink()
})

Then('{actor} sees the new app', async function (actor) {
  await Promise.all([
    actor.shouldBeAbleToPushLargeRepos(),
    actor.shouldSeeNewApp()
  ])
})

Given('{actor} has a pr app', async function (actor) {
  await actor.withExistingPrApp()
  await this.assembly.enablePrEvents()
})

When('{actor} pushes changes to the pr branch', async function (actor) {
  await actor.pushMoreChanges()
  await actor.shouldSeeDeployStarted()
})

Given('the deploy of the update of {actor}\'s pr app has started', async function (actor) {
  await actor.withExistingPrApp()
  await this.assembly.enablePrEvents()

  await actor.pushMoreChanges()
  await actor.shouldSeeDeployStarted()
  this.currentActor = actor
})

Given('{actor} received a notification that his app is updated', async function (actor) {
  await actor.withExistingPrApp()
  await this.assembly.enablePrEvents()

  await actor.pushMoreChanges()
  await actor.shouldSeeDeployStarted()
  await actor.shouldSeeDeploySuccessful()
})

Then('{actor} sees the updated app', async function (actor) {
  await actor.shouldSeeUpdatedApp()
})

When('{actor} closes that app\'s pr', async function (actor) {
  await actor.closePullRequest()
})

Then('{actor} can no longer access the app', async function (actor) {
  await actor.shouldNotSeeApp()
})

When('{actor} merges that app\'s pr', async function (actor) {
  await actor.mergePullRequest()
})

Given('{actor} has a closed pull request', async function (actor) {
  await actor.withClosedPullRequest()
  await this.assembly.enablePrEvents()
})

When('{actor} reopens that pull request', async function (actor) {
  await actor.reopenPullRequest()
})

Given('the deploy of {actor}\'s broken pr app has started', async function (actor) {
  this.assembly.fakeFlynnApi.failNextDeploy()
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  await actor.openPullRequest()
  await actor.shouldSeeDeployStarted()
  this.currentActor = actor
})

When('the deploy fails', async function () {
  await this.currentActor.shouldSeeDeployFinished()
})

Then('{actor} sees that the deploy failed', async function (actor) {
  await actor.shouldSeeDeployFailed()
  await actor.shouldNotSeeApp()
})

Given('{actor}\'s app needs environment variables {envVar} and {envVar}', function (actor, envVar1, envVar2) {
  this.envVars = [envVar1, envVar2]
})

When('{actor} adds configuration file specifying extra environment', async function (actor) {
  const content = `
env:
  ${this.envVars.map(([key, val]) => `${key}: ${val}`).join('\n  ')}
  `
  await actor.addPrAppConfig(content)
})

When('{actor} opens a new pull request', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  await actor.openPullRequest()
  await actor.shouldSeeDeployStarted()
})

Then('{actor}\'s pr app has those environment variables set', async function (actor) {
  await actor.shouldSeeDeploySuccessful()
  await actor.assertEnvironmentSet(this.envVars.reduce((result, [key, value]) => {
    result[key] = value
    return result
  }, {}))
})

Given('{actor}\'s app has a microservice that needs to be accessible from the main service', function (actor) {
})

When('{actor} adds configuration file specifying a route to the microservice', async function (actor) {
  const content = `
env:
  API_URL: "https://api-\${APP_DOMAIN}"
routes:
  api-web: "api-\${APP_DOMAIN}"
  `

  await actor.addPrAppConfig(content)
})

When('{actor} also sets an environment variable for the main service to address the microservice', function (actor) {
})

Then('{actor}\'s main service can reach the microservice', async function (actor) {
  await Promise.all([
    actor.assertEnvironmentSet({
      API_URL: `https://api-pr-${actor.prNumber}.${this.assembly.clusterDomain}`
    }),
    actor.assertServiceIsUp({
      service: `pr-${actor.prNumber}-api-web`,
      domain: `api-pr-${actor.prNumber}.${this.assembly.clusterDomain}`
    })
  ])
})

Given('{actor}\'s app needs postgres and redis', function (actor) {
})

When('{actor} adds configuration file specifying postgres and redis resources', async function (actor) {
  const content = `
env:
  FOO: bar
resources:
  - redis
  - postgres
  `

  await actor.addPrAppConfig(content)
})

Then('{actor}\'s pr app has postgres and redis', async function (actor) {
  await Promise.all([
    actor.shouldSeeDeploySuccessful(),
    actor.assertEnvironmentSet({
      FOO: 'bar',
      REDIS_URL: 'redis://stuff',
      POSTGRES_URL: 'postgres://stuff'
    }),
    actor.assertResources(['redis', 'postgres'])
  ])
})

Given('{actor}\'s app needs extra configuration', function (actor) {
})

When('{actor} adds configuration file with a typo', async function (actor) {
  const content = `
envs:
  FOO: bar
resources:
  - redis
  `
  await actor.addPrAppConfig(content)
})

Given('{actor} has a pr app with postgres', async function (actor) {
  await actor.withExistingPrApp({
    resources: ['postgres'],
    env: {FOO: 'bar'}
  })
  await this.assembly.enablePrEvents()
})

When('{actor} adds redis to the configuration file', async function (actor) {
  const content = `
resources:
  - postgres
  - redis
  `
  await actor.addPrAppConfig(content)
})

Given('{actor} opened a pull request', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  await actor.openPullRequest()
  await actor.shouldSeeDeploySuccessful()
})

When('{actor} checks pr app\'s version', function (actor) {
  this.appVersion = actor.getAppVersion()
})

Then('{actor} can see that version', function (actor) {
  actor.shouldSeeAppVersion(this.appVersion)
})

Given('{actor} updated his pull request', async function (actor) {
  await actor.withExistingPrApp({env: {VERSION: 5}})
  await this.assembly.enablePrEvents()
  await actor.pushMoreChanges()
  await actor.shouldSeeDeploySuccessful()
})

Then('{actor} can see updated version', function (actor) {
  actor.shouldSeeUpdatedVersion({
    oldVersion: 5,
    newVersion: this.appVersion
  })
})

Given('{actor} has pushed a broken change', async function (actor) {
  await actor.withExistingPrApp({env: {VERSION: 5}})
  this.assembly.fakeFlynnApi.failNextDeploy()
  await this.assembly.enablePrEvents()
  await actor.pushMoreChanges()
  await actor.shouldSeeDeployFailed()
})

Then('{actor} still sees the old version', function (actor) {
  const currentVersion = actor.getAppVersion()
  actor.shouldSeeAppVersion(currentVersion, 5)
})

Given('{actor} has a pr app with an environment variable {envVar} and {envVar}', async function (actor, envVar, envVar2) {
  const env = [envVar, envVar2].reduce((result, [key, value]) => {
    result[key] = value
    return result
  }, {})
  await actor.withExistingPrApp({env})
  await this.assembly.enablePrEvents()
})

When('{actor} changes {envVar}, adds {envVar} and removes {string} in the configuration file', async function (actor, envVar, envVar2, string) {
  const content = `
env:
  ${[envVar, envVar2].map(([key, val]) => `${key}: ${val}`).join('\n  ')}
  `
  await actor.addPrAppConfig(content)
})

Then('{actor}\'s app environment should change to {envVar}, {envVar} and keep {envVar}', async function (actor, envVar, envVar2, envVar3) {
  await actor.shouldSeeDeploySuccessful()
  await actor.assertEnvironmentSet([envVar, envVar2, envVar3].reduce((result, [key, value]) => {
    result[key] = value
    return result
  }, {}))
})

When('{actor} follows a deployment link from the last deploy', async function (actor) {
  this.lastDeployment = await actor.followLastDeploymentUrl()
})

Then('{actor} sees the logs of that deploy', function (actor) {
  actor.shouldSeeDeployLogs(this.lastDeployment)
})
