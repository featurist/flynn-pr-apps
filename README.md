# PR apps

## Usage

```
git clone https://github.com/featurist/pr-apps
cd pr-apps
flynn create pr-apps
git push flynn master
```

By default on each pr create/update it will create a flynn app `pr-${PR_NUMBER}` if it does not exist, checkout pr code and push it flynn.
Once deploy is complete, the pr app is accessible on `https://pr-${PR_NUMBER}.${FLYNN_CLUSTER_DOMAIN}`.

Should you wish a custom deploy script, you can do so by setting `APP_DEPLOY_SCRIPT` environment variable:

```
flynn env set APP_DEPLOY_SCRIPT=tools/deploy-pr-app
```

## Development

```
git clone https://github.com/featurist/pr-apps
nvm use
yarn install
yarn start
```

## Testing

```
yarn test
```
