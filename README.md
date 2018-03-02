# Flynn PR apps [![Build Status](https://travis-ci.org/featurist/flynn-pr-apps.svg?branch=master)](https://travis-ci.org/featurist/flynn-pr-apps)

Automatically deploy pull requests into [Flynn](https://flynn.io/) cluster. Heroku Review Apps DIY.

Compared to Heroku, Flynn is a good fit in the case where your _monorepo_ has more than one web service. Because you can deploy the entire _stack_ of services with single `git push`, whereas on Heroku you'd have no choice but to split the repo into multiple ones. Euuuww.

However Flynn is missing a few goodies one of which is [Heroku review apps](https://devcenter.heroku.com/articles/github-integration-review-apps)... until now! Flynn-pr-apps enables review apps for flynn. Interested? Read on.

## Usage

This is itself a flynn app, so first thing is to add it to your cluster (see [below](#create-pr-apps-flynn-app) for instructions).

Once up, the pr-apps instance will start watching pull requests lifecycle events. It'll deploy (open pr), update (push) or destroy (close pr) the app (or stack of apps) from the linked github repo into your flynn cluster. The deployed app url will be shown on github pull request page. E.g:

<img width="717" alt="image" src="https://user-images.githubusercontent.com/23721/35400213-0c76ae86-01ee-11e8-801b-d3b470ee17e5.png">

The deployed app's github commit sha is stored in a `VERSION` environment variable. It will be kept in sync with every update.

### Create Pr-Apps flynn app

```
git clone https://github.com/featurist/flynn-pr-apps
cd flynn-pr-apps
flynn create pr-apps
flynn env set GH_REPO=https://github.com/some-org/some-repo.git
flynn env set GH_USER_TOKEN=YOUR_TOKEN
flynn env set WEBHOOK_SECRET=$(openssl rand -hex 20)
flynn env set FLYNN_AUTH_KEY=$(flynn -a controller env get AUTH_KEY)
git push flynn master
```

Github account for `GH_USER_TOKEN` above should be a collaborator on `GH_REPO` with `Admin` privileges (for github api access).

### Register github webhook

For `GH_REPO` create a webhook for `pull_request` events and point it to `https://pr-apps.$FLYNN_CLUSTER_DOMAIN/webhook`.

Set content type to `application/json` and `Disable SSL verification`. More about webhooks [here](https://developer.github.com/webhooks/securing/).

### App manifest

Applications beyond trivial often require custom environment variables, extra resources, services and endpoints. Drop `pr-app.yaml` at the root of your project to be able to customise all this. E.g.:

```
env:
  API_URL: "https://api-${APP_DOMAIN}"
  DEBUG: true
resources:
  - redis
routes:
  api-web: "api-${APP_DOMAIN}"
```

Route key (`api-web` in the example above) refers to a service name in your `Procfile`. Each route's service is automatically scaled to 1.

`$APP_DOMAIN` is interpolated. E.g. `pr-234.prs.example.com`. Where `pr-234` is an autogenerated flynn app name for pull request 234 and `prs.example.com` is your flynn cluster domain.

## Development

It doesn't make much sense to run Pr Apps locally (even though you could with `yarn start`) because of the hard dependency of flynn api. I personally rely on tests and occasionally push the changes to flynn app in the real flynn cluster (see [Create Pr-Apps flynn app](#create-pr-apps-flynn-app) above).

## Testing

This project takes a novel approach to testing outlined in more detailed [here](https://github.com/subsecondtdd/todo-subsecond). There is no catchy name yet (ideas are welcome), but basically the idea is that instead of a traditional test pyramid with different sets of tests for different layers (integration, unit, etc.), there is a single layer of tests that runs in different modes (aka assemblies). Ranging from an in-memory core assembly, where all external dependencies (e.g. fs, database, browser ui, etc.) are replaced with memory implementations, down to the one with the most possible amount of "real" dependencies. The more "real" assemblies cover more code but also take longer to run.

The basic premise of all this is that a lot of your app is actaully that inner core, that can be tested all in memory in milliseconds. And as the application gets bigger it's mostly growing core and to a lesser extent the integration surface with external APIs. All this means:

- blazingly fast integration tests with a reasonable coverage whose performance does not degrade over time;
- the same tests can be run in a more real mode (in an envirinments where we don't care about fast feedback, e.g. CI) means that they don't go out of sync with reality;
- easy of debugging (if memory is passing, but memory + web service isn't, than the bug is likely in web service layer)
- and more (see the link above)

Back to Pr Apps though. In here you'll find three assemblies: memory, local and github.

To run memory assembly:

```
./test-memory
```

For local assembly (memory + real fs, postgres, git, pr apps service, fake flynn service, fake github remote) you need a local postgres server and a test db that is created with this command:

```
NODE_ENV=test $(yarn bin)/sequelize db:create
```

Then:

```
./test-local
```

As above except with actual github (remote + api). Needs some extra environment:

`TEST_GH_REPO` existing github repo (with username/org) that will be used in tests to simulate user workflow.
`TEST_GH_USER_TOKEN` API token of the account that can has access (create webhooks, pull code) to the above repo.

```
./test-real
```

Each of the above have `-debug` counterpart (e.g. `./test-local-debug`) that starts node debugging session.

Finally, run all of the above with `./test`

## We're Hiring!
Featurist provides full stack, feature driven development teams. Want to join us? Check out [our career opportunities](https://www.featurist.co.uk/careers/).
