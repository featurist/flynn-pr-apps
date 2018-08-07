Feature: View deployment

  @ci
  Scenario: view deployment page of a deployed pr app
    Given Frank opened a pull request
    When Frank follows a deployment link from the last deploy
    Then Frank sees details of that deployment

  Scenario: can not view deployment of destroyed app
    Given Frank opened two pull requests
    When Frank closes one of them
    Then Frank can only see deploy logs of the other one

  Scenario: redeploy
    Given the deployment of Frank's pr apps has failed
    When Frank decides to redeploy it
    Then Frank sees the new deployment page
    And Frank should see that deploy of a pr app has started

  Scenario: can not redeploy while another deployment is in progress
    Given the deployment of Frank's PR is in progress
    When Frank follows a deployment link from the last deploy
    Then Frank can not start another deploy
