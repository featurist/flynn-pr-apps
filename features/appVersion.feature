Feature: check what version is deployed

  Scenario: User can see deployed app version
    Given Frank opened a pull request
    When Frank checks pr app's version
    Then Frank can see that version

  Scenario: User can see updated app version
    Given Frank updated his pull request
    When Frank checks pr app's version
    Then Frank can see updated version
