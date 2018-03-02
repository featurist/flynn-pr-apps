Feature: View deployment logs

  Scenario: view logs of a deployed pr app
    Given Frank opened a pull request
    When Frank follows a deployment link from the last deploy
    Then Frank sees the logs of that deploy
