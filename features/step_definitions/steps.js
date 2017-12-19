const { Given, When, Then } = require('cucumber')

Given('{actor} pushed a branch to a code hosting service', async function (actor) {
  await this.assembly.createGithubWebhooks()
  await actor.pushBranch()
})

When('{actor} opens a pull request for that branch', async function (actor) {
  await actor.openPullRequest()
})

Then('{actor} should see that deploy of a pr app has started', async function (actor) {
  await actor.shouldSeeDeployStarted()
})

Given('the deploy of {actor}\'s new pr app has started', async function (actor) {
  await this.assembly.createGithubWebhooks()
  await actor.pushBranch()
  await actor.openPullRequest()
  this.currentActor = actor
})

When('the deploy is complete', async function () {
  await this.currentActor.shouldSeeDeployFinished()
})

Then('{actor} sees that the deploy is complete', async function (actor) {
  await actor.shouldSeeDeploySuccessful()
})

Given('{actor} received a notification that his pr app deploy is complete', async function (actor) {
  await this.assembly.createGithubWebhooks()
  await actor.pushBranch()
  await actor.openPullRequest()
  await actor.shouldSeeDeploySuccessful()
})

When('{actor} follows the link in the notifiation', async function (actor) {
  await actor.followDeployedAppLink()
})

Then('{actor} sees the deployed app', async function (actor) {
  await actor.shouldSeeDeployedApp()
})

Given('{actor} has a pr app', async function (actor) {
  await actor.pushBranch()
  await actor.openPullRequest()
  await this.assembly.createGithubWebhooks()
})

When('{actor} pushes changes to the pr branch', async function (actor) {
  await actor.pushMoreChanges()
})

Given('the deploy of the update of {actor}\'s pr app has started', async function (actor) {
  await actor.pushBranch()
  await actor.openPullRequest()
  await this.assembly.flynnService.createApp(`pr-${actor.currentPrNotifier.prNumber}`)

  await this.assembly.createGithubWebhooks()
  await actor.pushMoreChanges()

  this.currentActor = actor
})
