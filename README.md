# PR apps

Automatically deploy pull requests into flynn cluster. Heroku Review Apps DIY.

## Usage

### Creaate pr-apps flynn app

```
git clone https://github.com/featurist/pr-apps
cd pr-apps
flynn create pr-apps
flynn env set GH_REPO=https://github.com/some-org/some-repo.git
flynn env set GH_USER_TOKEN=YOUR_TOKEN
flynn env set WEBHOOK_SECRET=$(openssl rand -hex 20)
flynn env set FLYNN_CLUSTER_DOMAIN=prs.example.com
flynn env set FLYNN_AUTH_KEY=$(flynn -a controller env get AUTH_KEY)
git push flynn master
```

### Register github webhook

For `GH_REPO` create a webhook for `pull_request` and `push` events and point it to `https://pr-apps.$FLYNN_CLUSTER_DOMAIN`.

Set content type to `application/json` and `Disable SSL verification`. More about webhooks [here](https://developer.github.com/webhooks/securing/).


Once up, pr-apps will start watching pull requests lifecycle events. It'll deploy (open pr), update (push) or destroy (close pr) the app specified in `GH_REPO` in your flynn cluster. The deployed app url will be shown on github pull request page.

TODO describe worker that destroys stale prs when (and if) there is such thing

TODO pr-apps.yaml

```
env:
  FOO: bar
  DEBUG: true
resources:
  - redis
routes:
  api-web:
    subdomain: api
scale:
  web: 2
  api-web: 1
```

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
DEBUG=pr-apps* yarn test-real
```
