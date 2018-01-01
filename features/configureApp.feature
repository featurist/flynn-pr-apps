@localOnly
Feature: Configure Pr App environment, resources, routes, etc.

  Scenario: New Pr App environment
    Given Frank's app needs environment variables "FOO=bar" and "STUFF=1"
    When Frank adds configuration file specifying extra environment
    And Frank opens a new pull request
    Then Frank's pr app has those environment variables set
