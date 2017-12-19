Feature: Deploy Github pull request

  Scenario: User opens new pull request
    Given Frank pushed a branch to a code hosting service
    When Frank opens a pull request for that branch
    Then Frank should see that deploy of a pr app has started

  Scenario: Pr author is notified when deploy of the new app is complete
    Given the deploy of Frank's new pr app has started
    When the deploy is complete
    Then Frank sees that the deploy is complete

  Scenario: Pr author visits new app
    Given Frank received a notification that his pr app deploy is complete
    When Frank follows the link in the notifiation
    Then Frank sees the new app

  Scenario: User pushes changes to existing pull request
    Given Frank has a pr app
    When Frank pushes changes to the pr branch
    Then Frank should see that deploy of a pr app has started

  Scenario: Pr author is notified when update is deployed
    Given the deploy of the update of Frank's pr app has started
    When the deploy is complete
    Then Frank sees that the deploy is complete

  Scenario: Pr author visits updated app
    Given Frank received a notification that his app is updated
    When Frank follows the link in the notifiation
    Then Frank sees the updated app
