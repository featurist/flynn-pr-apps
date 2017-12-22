Feature: Automatically destroy Pr App

  Scenario: User merges pull request
    Given Frank has a pr app
    When Frank merges that app's pr
    Then Frank can no longer access the app

  Scenario: User closes pull request
    Given Frank has a pr app
    When Frank closes that app's pr
    Then Frank can no longer access the app
