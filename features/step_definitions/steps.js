const { Given, When, Then } = require('cucumber')

Given('{actor} pushed a branch to a code hosting service', async function (actor) {
  await actor.pushBranch()
})
When('{actor} opens a pull request for that branch', async function (actor) {
  await actor.openPullRequest()
})
Then('{actor} should see that deploy of a pr app has started', async function (actor) {
  await actor.shouldSeeDeployStarted()
})
Given('the deploy of {actor}\'s pr app has started', async function (actor) {
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
  // Write code here that turns the phrase above into concrete actions
  return 'pending'
})
When('{actor} follows the link in the notifiation', async function (actor) {
  // Write code here that turns the phrase above into concrete actions
  return 'pending'
})
Then('{actor} sees the deployed app', async function (actor) {
  // Write code here that turns the phrase above into concrete actions
  return 'pending'
})
