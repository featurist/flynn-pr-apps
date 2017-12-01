Feature: Deploy Github pull request

  Scenario: User opens new pull request
    Given Frank pushed a branch to a code hosting service
    When Frank opens a pull request for that branch
    Then Frank should see that deploy of a pr app has started

  Scenario: Pr author is notified when deploy is complete
    Given the deploy of Frank's pr app has started
    When the deploy is complete
    Then Frank is notified that the deploy is complete

  Scenario: Pr author visits deployed app
    Given Frank received a notification that his pr app deploy is complete
    When Frank follows the link in the notifiation
    Then Frank sees the deployed app
