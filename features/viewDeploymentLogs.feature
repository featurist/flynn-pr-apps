Feature: View deployment logs

  Scenario: view logs of a deployed pr app
    Given Frank opened a pull request
    When Frank follows a deployment link from the last deploy
    Then Frank sees the logs of that deploy

  Scenario: can not view logs of destroyed app
    Given Frank opened two pull requests
    When Frank closes one of them
    Then Frank can only see deploy logs of the other one
