Feature: Deploy Github pull request

  @ci
  Scenario: User opens new pull request
    Given Frank pushed a branch to a code hosting service
    When Frank opens a pull request for that branch
    Then Frank should see that deploy of a pr app has started

  @ci
  Scenario: Pr author is notified when deploy of the new app is complete
    Given the deploy of Frank's new pr app has started
    When the deploy is complete
    Then Frank sees that the deploy is complete

  @ci
  Scenario: Pr author visits new app
    Given Frank received a notification that his pr app deploy is complete
    When Frank follows the link in the notifiation
    Then Frank sees the new app

  @ci
  Scenario: User pushes changes to existing pull request
    Given Frank has a pr app
    When Frank pushes changes to the pr branch
    Then Frank should see that deploy of a pr app has started

  @ci
  Scenario: Pr author is notified when update is deployed
    Given the deploy of the update of Frank's pr app has started
    When the deploy is complete
    Then Frank sees that the deploy is complete

  Scenario: Pr author visits updated app
    Given Frank received a notification that his app is updated
    When Frank follows the link in the notifiation
    Then Frank sees the updated app

  @ci
  Scenario: User reopens pull request
    Given Frank has a closed pull request
    When Frank reopens that pull request
    Then Frank should see that deploy of a pr app has started

  @ci
  Scenario: Pr author is notified when deploy has failed
    Given the deploy of Frank's broken pr app has started
    When the deploy fails
    Then Frank sees that the deploy failed

  Scenario: User pushes more changes while a deploy is in progress
    Given a deploy of Frank's pr app has started
    When Frank pushes changes to the pr branch while deploy is still in progress
    Then Frank's new deploy does not start until the current one is complete
