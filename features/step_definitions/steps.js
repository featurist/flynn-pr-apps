const { Given, When, Then } = require('cucumber')

Given('{actor} pushed a branch to a code hosting service', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
})

When('{actor} opens a pull request for that branch', async function (actor) {
  this.prNotifier = await actor.openPullRequest()
})

Then('{actor} should see that deploy of a pr app has started', async function (actor) {
  await actor.shouldSeeDeployStarted(this.prNotifier)
})

Given('the deploy of {actor}\'s new pr app has started', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  this.prNotifier = await actor.openPullRequest()
  await actor.shouldSeeDeployStarted(this.prNotifier)
  this.currentActor = actor
})

When('the deploy is complete', async function () {
  await this.currentActor.shouldSeeDeployFinished(this.prNotifier)
})

Then('{actor} sees that the deploy is complete', async function (actor) {
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
})

Given('{actor} received a notification that his pr app deploy is complete', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  this.prNotifier = await actor.openPullRequest()
  await actor.shouldSeeDeployStarted(this.prNotifier)
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
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
  this.prNotifier = await actor.pushMoreChanges()
  await actor.shouldSeeDeployStarted(this.prNotifier)
})

Given('the deploy of the update of {actor}\'s pr app has started', async function (actor) {
  await actor.withExistingPrApp()
  await this.assembly.enablePrEvents()

  this.prNotifier = await actor.pushMoreChanges()
  await actor.shouldSeeDeployStarted(this.prNotifier)
  this.currentActor = actor
})

Given('{actor} received a notification that his app is updated', async function (actor) {
  await actor.withExistingPrApp()
  await this.assembly.enablePrEvents()

  this.prNotifier = await actor.pushMoreChanges()
  await actor.shouldSeeDeployStarted(this.prNotifier)
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
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
  this.prNotifier = await actor.reopenPullRequest()
})

Given('the deploy of {actor}\'s broken pr app has started', async function (actor) {
  this.assembly.fakeFlynnApi.failNextDeploy()
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  this.prNotifier = await actor.openPullRequest()
  await actor.shouldSeeDeployStarted(this.prNotifier)
  this.currentActor = actor
})

When('the deploy fails', async function () {
  await this.currentActor.shouldSeeDeployFinished(this.prNotifier)
})

Then('{actor} sees that the deploy failed', async function (actor) {
  await actor.shouldSeeDeployFailed(this.prNotifier)
  await actor.shouldNotSeeApp()
})

Then('{actor} sees that the deploy failed instantly', async function (actor) {
  await actor.shouldSeeDeployFailed(this.prNotifier, {instantly: true})
  await actor.shouldNotSeeApp()
})

Then('{actor} can see the validation error', async function (actor) {
  const logPage = await actor.followLastDeploymentUrl({prNotifier: this.prNotifier})
  actor.shouldSeeValidationError(logPage)
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
  this.prNotifier = await actor.openPullRequest()
})

Then('{actor}\'s pr app has those environment variables set', async function (actor) {
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
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
    actor.shouldSeeDeploySuccessful(this.prNotifier),
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
  this.scmVersion = await actor.pushBranch()
  this.prNotifier = await actor.openPullRequest()
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
})

Given('{actor} updated his pull request', async function (actor) {
  await actor.withExistingPrApp()
  await this.assembly.enablePrEvents()
  this.prNotifier = await actor.pushMoreChanges()
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
})

Given('{actor} has pushed a broken change', async function (actor) {
  await actor.withExistingPrApp()
  this.assembly.fakeFlynnApi.failNextDeploy()
  await this.assembly.enablePrEvents()
  this.prNotifier = await actor.pushMoreChanges()
  await actor.shouldSeeDeployFailed(this.prNotifier)
})

Given('the deployment of {actor}\'s pr apps has failed', async function (actor) {
  await actor.withExistingPrApp()
  this.assembly.fakeFlynnApi.failNextDeploy()
  await this.assembly.enablePrEvents()
  this.prNotifier = await actor.pushMoreChanges()
  await actor.shouldSeeDeployFailed(this.prNotifier)
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
  await actor.shouldSeeDeploySuccessful(this.prNotifier)
  await actor.assertEnvironmentSet([envVar, envVar2, envVar3].reduce((result, [key, value]) => {
    result[key] = value
    return result
  }, {}))
})

When('{actor} follows a deployment link from the last deploy', async function (actor) {
  this.logPage = await actor.followLastDeploymentUrl({prNotifier: this.prNotifier})
})

Then('{actor} sees details of that deployment', function (actor) {
  actor.shouldSeeDeployLogs(this.logPage)
  actor.shouldSeeDeployStatus(this.logPage)
  actor.shouldSeeDeployedAppVersion(this.logPage, this.scmVersion)
  actor.shouldSeeLinkToFlynnApp(this.logPage)
  actor.shouldSeeLinkToDeployedApp(this.logPage)
})

Given('{actor} opened two pull requests', async function (actor) {
  await this.assembly.enablePrEvents()

  await actor.pushBranch()
  let prNotifier = await actor.openPullRequest({prNumber: 23})
  await actor.shouldSeeDeploySuccessful(prNotifier)

  this.deployLogUrl1 = actor.getLastDeploymentUrl(prNotifier)
  actor.shouldSeeDeployLogs(
    await actor.followLastDeploymentUrl({url: this.deployLogUrl1})
  )

  await actor.pushBranch('Feature2')
  prNotifier = await actor.openPullRequest({prNumber: 24, branch: 'Feature2'})
  await actor.shouldSeeDeploySuccessful(prNotifier)

  this.deployLogUrl2 = actor.getLastDeploymentUrl(prNotifier)
  actor.shouldSeeDeployLogs(
    await actor.followLastDeploymentUrl({url: this.deployLogUrl2})
  )
})

When('{actor} closes one of them', async function (actor) {
  await actor.mergePullRequest(23)
  await actor.shouldNotSeeApp('pr-23')
})

Then('{actor} can only see deploy logs of the other one', async function (actor) {
  await actor.shouldNotSeeDeployLogs(this.deployLogUrl1)
  actor.shouldSeeDeployLogs(
    await actor.followLastDeploymentUrl({url: this.deployLogUrl2})
  )
})

When('{actor} decides to redeploy it', async function (actor) {
  this.logPage = await actor.followLastDeploymentUrl({prNotifier: this.prNotifier})
  this.prevDeploymentId = actor.lookUpDeploymentId(this.logPage)
  await actor.redeploy(this.logPage)
})

Then('{actor} sees the new deployment page', async function (actor) {
  await actor.shouldSeeNewDeploymentDetails({
    prNotifier: this.prNotifier,
    prevDeploymentId: this.prevDeploymentId
  })
})

Given('the deployment of {actor}\'s PR is in progress', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  this.prNotifier = await actor.openPullRequest()
  await actor.shouldSeeDeployStarted(this.prNotifier)
})

Then('{actor} can not start another deploy', async function (actor) {
  await actor.shouldNotBeAbleToRedeploy(this.logPage)
})

Then('{actor}\'s new deploy does not start until the current one is complete', async function (actor) {
  await actor.shouldSeeOneDeployAfterAnother(this.prNotifier)
})

Given('a deploy of {actor}\'s pr app has started', async function (actor) {
  await this.assembly.enablePrEvents()
  await actor.pushBranch()
  this.prNotifier = await actor.openPullRequest()
})

When('{actor} pushes changes to the pr branch while deploy is still in progress', async function (actor) {
  await actor.pushMoreChanges()
})
