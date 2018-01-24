Feature: check what version is deployed

  Scenario: User can see the deployed app's version
    Given Frank opened a pull request
    When Frank checks new pr app's version
    Then Frank can see that version
