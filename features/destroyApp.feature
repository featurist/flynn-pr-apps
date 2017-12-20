Feature: Automatically destroy Pr App

  Scenario: User is closes pull request
    Given Frank has a pr app
    When Frank closes that app's pr
    Then Frank can no longer access the app
