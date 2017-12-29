# Flynn PR apps [![Build Status](https://semaphoreci.com/api/v1/featurist/flynn-pr-apps/branches/master/badge.svg)](https://semaphoreci.com/featurist/flynn-pr-apps)

Automatically deploy pull requests into [Flynn](https://flynn.io/) cluster. Heroku Review Apps DIY.

## Usage

### Create Pr-Apps flynn app

```
git clone https://github.com/featurist/flynn-pr-apps
cd flynn-pr-apps
flynn create pr-apps
flynn env set GH_REPO=https://github.com/some-org/some-repo.git
flynn env set GH_USER_TOKEN=YOUR_TOKEN
flynn env set WEBHOOK_SECRET=$(openssl rand -hex 20)
flynn env set FLYNN_CLUSTER_DOMAIN=prs.example.com
flynn env set FLYNN_AUTH_KEY=$(flynn -a controller env get AUTH_KEY)
git push flynn master
```

Github account above should be a collaborator with `Admin` privileges (for github api access).

### Register github webhook

For `GH_REPO` create a webhook for `pull_request` events and point it to `https://pr-apps.$FLYNN_CLUSTER_DOMAIN`.

Set content type to `application/json` and `Disable SSL verification`. More about webhooks [here](https://developer.github.com/webhooks/securing/).


Once up, pr-apps will start watching pull requests lifecycle events. It'll deploy (open pr), update (push) or destroy (close pr) the app specified in `GH_REPO` in your flynn cluster. The deployed app url will be shown on github pull request page.

### App manifest

Applications beyond trivial often require custom environment variables, extra resources, services and endpoints. Drop `pr-apps.yaml` in the root of your project to be able to customise all this. E.g.:

```
env:
  API_URL: "https://api-${APP_DOMAIN}"
  DEBUG: true
resources:
  - redis
routes:
  api-web: api-${APP_DOMAIN}
scale:
  web: 2
  api-web: 1
```

`$APP_DOMAIN` will be interpolated. E.g. `pr-234.prs.example.com`

## Development

It doesn't make much sense to run Pr Apps locally (even though you could with `yarn start`) because of the hard dependency of flynn api. I personally rely on tests and occasionally push the changes to flynn app in the real flynn cluster (see [Create Pr-Apps flynn app](#Create Pr-Apps flynn app) above).

## Testing

Run core in-memory tests:

```
yarn test-memory
```

As above except with real fs, git, pr apps service and fake flynn service:

```
yarn test-local
```

As above except with actual github (remote + api). Needs some extra environment:

`TEST_GH_REPO` existing github repo (with username/org) that will be used in tests to simulate user workflow.
`TEST_GH_USER_TOKEN` API token of the account that can has access (create webhooks, pull code) to the above repo.

```
yarn test-real
```

Each of the above have `-debug` counterpart (e.g. `yarn test-local-debug`) that starts node debugging session.

Finally, run all of the above with `yarn test`
