Feature: check what version is deployed

  Scenario: User sees deployed app version
    Given Frank opened a pull request
    When Frank checks pr app's version
    Then Frank can see that version

  Scenario: User sees updated app version
    Given Frank updated his pull request
    When Frank checks pr app's version
    Then Frank can see updated version

  Scenario: User sees old version if deploy fails
    Given Frank has pushed a broken change
    When Frank checks pr app's version
    Then Frank still sees the old version
