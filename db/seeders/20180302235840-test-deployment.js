const logChunks = `Fri  2 Mar 21:36:19 GMT 2018: git rev-parse HEAD
Fri  2 Mar 21:36:19 GMT 2018: export GIT_COMMIT=db363d255eb60d74d5547584c38c71348677cf15
Fri  2 Mar 21:36:19 GMT 2018: GIT_COMMIT=db363d255eb60d74d5547584c38c71348677cf15
Fri  2 Mar 21:36:19 GMT 2018: docker-compose build base
Building base
Step 1/20 : FROM node:8.9.1
 ---> 1934b0b038d1
Step 2/20 : RUN apt-get update   && apt-get install -y apt-transport-https ca-certificates     && apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D   && echo "deb https://apt.dockerproject.org/repo debian-jessie main" > /etc/apt/sources.list.d/docker.list     && apt-get update   && apt-get install -y libaio1 build-essential unzip curl docker-engine python-pip python-dev zip   && pip install awscli     && mkdir -p /opt/oracle   && curl -L https://github.com/PaulCampbell/docker-node-oracle/raw/master/oracle/linux/instantclient-basic-linux.x64-12.1.0.2.0.zip > instantclient-basic-linux.x64-12.1.0.2.0.zip   && curl -L https://github.com/PaulCampbell/docker-node-oracle/raw/master/oracle/linux/instantclient-sdk-linux.x64-12.1.0.2.0.zip > instantclient-sdk-linux.x64-12.1.0.2.0.zip   && unzip instantclient-basic-linux.x64-12.1.0.2.0.zip -d /opt/oracle   && unzip instantclient-sdk-linux.x64-12.1.0.2.0.zip -d /opt/oracle   && mv /opt/oracle/instantclient_12_1 /opt/oracle/instantclient   && ln -s /opt/oracle/instantclient/libclntsh.so.12.1 /opt/oracle/instantclient/libclntsh.so   && ln -s /opt/oracle/instantclient/libocci.so.12.1 /opt/oracle/instantclient/libocci.so   && echo '/opt/oracle/instantclient/' | tee -a /etc/ld.so.conf.d/oracle_instant_client.conf && ldconfig
 ---> Using cache
 ---> a0a45c875748
Step 3/20 : ENV TINI_VERSION v0.15.0
 ---> Using cache
 ---> ab2251f72cfc
Step 4/20 : ADD https://github.com/krallin/tini/releases/download/TINI_VERSION/tini /tini

 ---> Using cache
 ---> 19253b49706c
Step 5/20 : RUN chmod +x /tini
 ---> Using cache
 ---> fca057fabd02
Step 6/20 : ENTRYPOINT /tini --
 ---> Using cache
 ---> 3f87034fc9e6
Step 7/20 : ARG NODE_ENV
 ---> Using cache
 ---> 09c51768d7c2
Step 8/20 : ENV NODE_ENV $NODE_ENV
 ---> Using cache
 ---> a47b55d64b33
Step 9/20 : ENV BABEL_ENV production
 ---> Using cache
 ---> 24aaf5df7f35
Step 10/20 : RUN echo $NODE_ENV
 ---> Using cache
 ---> a51eb8df73c9
Step 11/20 : WORKDIR /app
 ---> Using cache
 ---> ad9491495080
Step 12/20 : ADD package.json yarn.lock ./
 ---> Using cache
 ---> b000d69e3210
Step 13/20 : ADD tools/electron-rebuild.js ./tools/electron-rebuild.js
 ---> Using cache
 ---> 1d3c6bd41d98
Step 14/20 : RUN yarn install
 ---> Using cache
 ---> 41b279377eaa
Step 15/20 : ADD . .
 ---> 57cb321a7ad4
Removing intermediate container 0f9e1cff58d9
Step 16/20 : ARG GIT_COMMIT
 ---> Running in 14752c961c9d
 ---> faab51dcef89
Removing intermediate container 14752c961c9d
Step 17/20 : LABEL git-commit $GIT_COMMIT
 ---> Running in 5f45f1bf2cd2
 ---> c94edfb7aca9
Removing intermediate container 5f45f1bf2cd2
Step 18/20 : RUN echo $GIT_COMMIT
 ---> Running in b43b99ef89d4
db363d255eb60d74d5547584c38c71348677cf15
 ---> 0c1547d56316
Removing intermediate container b43b99ef89d4
 ---> Running in 0ba28b1977d6
 ---> 0e6de2818f73
Removing intermediate container 0ba28b1977d6
Step 20/20 : RUN npm run postbuild
 ---> Running in b1b19940b97e

> booking-services@1.0.0 postbuild /app
> scripts/postbuild

[91m+ yarn css
[0myarn run v1.3.2
$ tools/compile-css && yarn api-client-css
$ postcss 'services/api-client/styles/app.css' -m -d services/web/dist/docs/client/
Done in 11.51s.
[91m+ yarn compress-api-client-css
[0myarn run v1.3.2
$ postcss -m --use cssnano -r services/web/dist/docs/client/app.css
Done in 2.19s.
[91m+ yarn compile-js
[0myarn run v1.3.2
$ tools/compile-all-js
[91m+ tools/compile-js services/tour-group-editor/browser/index.js services/tour-group-editor/browser/dist/index.js
[0m[91m+ export BABEL_ENV=production
+ BABEL_ENV=production
+ inputFile=services/tour-group-editor/browser/index.js
[0m[91m++ basename -s .js services/tour-group-editor/browser/index.js
[0m[91m+ baseName=index
+ mapMaxFile=index.max.js.map
+ mapFile=index.js.map
+ indexMaxFile=index.max.js
[0m[91m++ basename services/tour-group-editor/browser/dist/index.js
[0m[91m+ outputFile=index.js
[0m[91m++++ dirname services/tour-group-editor/browser/index.js
[0m[91m+++ dirname services/tour-group-editor/browser
[0m[91m++ basename services/tour-group-editor
[0m[91m+ serviceName=tour-group-editor
[0m[91m++ dirname services/tour-group-editor/browser/dist/index.js
[0m[91m+ destDir=services/tour-group-editor/browser/dist
+ destDir=services/tour-group-editor/browser/dist
[0m[91m+ mkdir -p services/tour-group-editor/browser/dist
[0m[91m+ '[' '' = -w ']'
[0m[91m+ browserify services/tour-group-editor/browser/index.js -r babel-polyfill --debug --extension .jsx -t babelify
[0m[91m+ exorcist services/tour-group-editor/browser/dist/index.max.js.map
[0m[91m+ ./node_modules/uglify-js/bin/uglifyjs services/tour-group-editor/browser/dist/index.max.js --source-map content=services/tour-group-editor/browser/dist/index.max.js.map,filename=services/tour-group-editor/browser/dist/index.js.map,url=index.js.map -o services/tour-group-editor/browser/dist/index.js -cm
[0m[91mINFO: Using input source map: services/tour-group-editor/browser/dist/index.max.js.map[0m[91m
[0m[91m+ tools/compile-js services/web/booking-engine/fakelogin.js services/web/booking-engine/dist/fakelogin.js
[0m[91m+ export BABEL_ENV=production
+ BABEL_ENV=production
+ inputFile=services/web/booking-engine/fakelogin.js
[0m[91m++ basename -s .js services/web/booking-engine/fakelogin.js
[0m[91m+ baseName=fakelogin
+ mapMaxFile=fakelogin.max.js.map
[0m[91m+ mapFile=fakelogin.js.map
+ indexMaxFile=fakelogin.max.js
[0m[91m++ basename services/web/booking-engine/dist/fakelogin.js
[0m[91m+ outputFile=fakelogin.js
[0m[91m++++ dirname services/web/booking-engine/fakelogin.js
[0m[91m+++ dirname services/web/booking-engine
[0m[91m++ basename services/web
[0m[91m+ serviceName=web
[0m[91m++ dirname services/web/booking-engine/dist/fakelogin.js
[0m[91m+ destDir=services/web/booking-engine/dist
+ destDir=services/web/booking-engine/dist
[0m[91m+ mkdir -p services/web/booking-engine/dist
[0m[91m+ '[' '' = -w ']'
[0m[91m+ browserify services/web/booking-engine/fakelogin.js -r babel-polyfill --debug --extension .jsx -t babelify
+ exorcist services/web/booking-engine/dist/fakelogin.max.js.map
[0m[91m+ ./node_modules/uglify-js/bin/uglifyjs services/web/booking-engine/dist/fakelogin.max.js --source-map content=services/web/booking-engine/dist/fakelogin.max.js.map,filename=services/web/booking-engine/dist/fakelogin.js.map,url=fakelogin.js.map -o services/web/booking-engine/dist/fakelogin.js -cm
[0m[91mINFO: Using input source map: services/web/booking-engine/dist/fakelogin.max.js.map[0m[91m
[0m[91m+ tools/compile-js services/web/booking-engine/index.js services/web/booking-engine/dist/index.js
[0m[91m+ export BABEL_ENV=production
+ BABEL_ENV=production
+ inputFile=services/web/booking-engine/index.js
[0m[91m++ basename -s .js services/web/booking-engine/index.js
[0m[91m+ baseName=index
+ mapMaxFile=index.max.js.map
+ mapFile=index.js.map
+ indexMaxFile=index.max.js
[0m[91m++ basename services/web/booking-engine/dist/index.js
[0m[91m+ outputFile=index.js
[0m[91m++++ dirname services/web/booking-engine/index.js
[0m[91m+++ dirname services/web/booking-engine
[0m[91m++ basename services/web
[0m[91m+ serviceName=web
[0m[91m++ dirname services/web/booking-engine/dist/index.js
[0m[91m+ destDir=services/web/booking-engine/dist
+ destDir=services/web/booking-engine/dist
+ mkdir -p services/web/booking-engine/dist
[0m[91m+ '[' '' = -w ']'
[0m[91m+ exorcist services/web/booking-engine/dist/index.max.js.map
[0m[91m+ browserify services/web/booking-engine/index.js -r babel-polyfill --debug --extension .jsx -t babelify
[0m[91m+ ./node_modules/uglify-js/bin/uglifyjs services/web/booking-engine/dist/index.max.js --source-map content=services/web/booking-engine/dist/index.max.js.map,filename=services/web/booking-engine/dist/index.js.map,url=index.js.map -o services/web/booking-engine/dist/index.js -cm
[0m[91mINFO: Using input source map: services/web/booking-engine/dist/index.max.js.map[0m[91m
[0m[91m+ tools/compile-js services/api-client/browser/index.js services/api-client/browser/dist/docs/client/index.js
[0m[91m+ export BABEL_ENV=production
+ BABEL_ENV=production
[0m[91m+ inputFile=services/api-client/browser/index.js
[0m[91m++ basename -s .js services/api-client/browser/index.js
[0m[91m+ baseName=index
+ mapMaxFile=index.max.js.map
+ mapFile=index.js.map
+ indexMaxFile=index.max.js
[0m[91m++ basename services/api-client/browser/dist/docs/client/index.js
[0m[91m+ outputFile=index.js
[0m[91m++++ dirname services/api-client/browser/index.js
[0m[91m+++ dirname services/api-client/browser
[0m[91m++ basename services/api-client
[0m[91m+ serviceName=api-client
[0m[91m++ dirname services/api-client/browser/dist/docs/client/index.js
[0m[91m+ destDir=services/api-client/browser/dist/docs/client
+ destDir=services/api-client/browser/dist/docs/client
+ mkdir -p services/api-client/browser/dist/docs/client
[0m[91m+ '[' '' = -w ']'
[0m[91m+ exorcist services/api-client/browser/dist/docs/client/index.max.js.map
[0m[91m+ browserify services/api-client/browser/index.js -r babel-polyfill --debug --extension .jsx -t babelify
[0m[91m+ ./node_modules/uglify-js/bin/uglifyjs services/api-client/browser/dist/docs/client/index.max.js --source-map content=services/api-client/browser/dist/docs/client/index.max.js.map,filename=services/api-client/browser/dist/docs/client/index.js.map,url=index.js.map -o services/api-client/browser/dist/docs/client/index.js -cm
[0m[91mINFO: Using input source map: services/api-client/browser/dist/docs/client/index.max.js.map[0m[91m
[0mDone in 78.63s.
[91m+ yarn vendor-assets
[0myarn run v1.3.2
$ tools/vendor-assets
[91m+ mkdir -p services/web/api-docs/vendor/css
[0m[91m+ cp node_modules/bulma/css/bulma.css services/web/api-docs/vendor/css/
[0m[91m+ cp node_modules/bulma-extensions/bulma-tooltip/dist/bulma-tooltip.min.css services/web/api-docs/vendor/css/
[0m[91m+ cp node_modules/swagger-ui-dist/swagger-ui.css services/web/api-docs/vendor/css/
[0m[91m+ cp -R node_modules/@fortawesome/ services/web/api-docs/vendor/js/
[0m[91m+ mkdir -p services/web/api-docs/vendor/js
[0m[91m+ cp node_modules/swagger-ui-dist/swagger-ui-bundle.js services/web/api-docs/vendor/js/
[0mDone in 0.55s.
[91m+ yarn write-release-time
[0myarn run v1.3.2
$ date '+{"time": %s000}' > services/web/release.json
Done in 0.28s.
[91m+ [  = pr-envs ]
[0m ---> b6e6a013e76b
Removing intermediate container b1b19940b97e
Successfully built b6e6a013e76b
Successfully tagged booking-services-base:dev_aws
Fri  2 Mar 21:38:08 GMT 2018: '[' 1 -gt 0 ']'
Fri  2 Mar 21:38:08 GMT 2018: docker-compose run --rm base npm run deploy

> booking-services@1.0.0 deploy /app
> npm run deploy-tropics_data_service && npm run deploy-web-aws && npm run deploy-pricing-aws


> booking-services@1.0.0 deploy-tropics_data_service /app
> npm run test-database-permissions && tools/env services/tropics_data_service/deploy`
  .split('\n')
  .reduce((result, line, i) => {
    // make some log chunks multiline
    if (i > 0 && i % 5 === 0) {
      result[result.length - 1] = result[result.length - 1] + '\n' + line
    } else {
      result.push(line)
    }
    return result
  }, [])
  .map(line => ({
    text: line,
    DeploymentId: 'a4d8ffe3-7a6d-47a9-aa69-6d62cc436e0e',
    createdAt: new Date(),
    updatedAt: new Date()
  }))

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Deployments', [{
      id: 'a4d8ffe3-7a6d-47a9-aa69-6d62cc436e0e',
      status: 'success',
      deployedAppUrl: 'http://example.com/app',
      prNumber: 3456,
      branch: 'stuff',
      version: 'sdfl342342l',
      flynnAppUrl: 'http://dashboard.prs.example.com/apps/234',
      createdAt: new Date(),
      updatedAt: new Date()
    }])
    await queryInterface.bulkInsert('LogChunks', logChunks, {returning: true})
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('LogChunks')
    await queryInterface.bulkDelete('Deployments')
  }
}
