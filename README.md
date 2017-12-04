# PR apps

Automatically deploy pull requests into flynn cluster. AKA Heroku review apps DIY.

## Usage

```
git clone https://github.com/featurist/pr-apps
cd pr-apps
flynn create pr-apps
flynn env set GH_REPO
flynn env set GH_USER_TOKEN
flynn env set APP_DEPLOY_SCRIPT=tools/deploy-pr-app
flynn env set FLYNN_CLUSTER_DOMAIN=prs.example.com
git push flynn master
```

The actual deployment needs to be scripted by user. pr-apps is simply going to run that script (specified by `FLYNN_CLUSTER_DOMAIN`) passing an app name - `pr-${PR_NUMBER}` - as an argument.

The script should deploy the app here `https://pr-${PR_NUMBER}.${FLYNN_CLUSTER_DOMAIN}` because that link is going to be posted to github as deployment link.

This is likely to change in future as we're perfectly able to deploy based on some kind of a json manifest.

## Development

Needs some extra environment:

`GH_REPO` github repo to deploy.
`GH_USER_TOKEN` API token of the account that is able to pull code and create deployments on the above repo.

```
git clone https://github.com/featurist/pr-apps
nvm use
yarn install
yarn start
```

## Testing

Run core in-memory tests:

```
yarn test
```

Run with everything real (git, github). Needs some extra environment:

`TEST_GH_REPO` existing github repo (with username/org) that will be used in tests to simulate user workflow.
`TEST_GH_USER_TOKEN` API token of the account that can has access (create webhooks, pull code) to the above repo.

```
yarn test-real
```
