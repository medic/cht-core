/* eslint-disable max-len */

const path = require('path');

const {
  BUILD_NUMBER,
  INTERNAL_CONTRIBUTOR,
} = process.env;

const DEV = !BUILD_NUMBER;

const buildUtils = require('./scripts/build');
const buildVersions = require('./scripts/build/versions');

const ESLINT_COMMAND = './node_modules/.bin/eslint --color --cache';

module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-exec');

  // Project configuration
  grunt.initConfig({
    exec: {
      'compile-ddocs-primary': 'node ./scripts/build/ddoc-compile.js primary',
      'compile-ddocs-staging': 'node ./scripts/build/ddoc-compile.js staging',
      'uglify-api':
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/login/script.js -o api/build/static/login/script.js && ' +
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/login/lib-bowser.js -o api/build/static/login/lib-bowser.js',
      'uglify-admin':
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/admin/js/main.js -o api/build/static/admin/js/main.js && ' +
        'node ./node_modules/uglify-js/bin/uglifyjs api/build/static/admin/js/templates.js -o api/build/static/admin/js/templates.js',
      'push-ddoc-to-staging': 'node ./scripts/build/push-ddoc-to-staging.js',
      'clean-build-dir': 'rm -rf build && mkdir build',
      'mocha-unit-webapp': 'UNIT_TEST_ENV=1 ./node_modules/mocha/bin/_mocha "webapp/tests/mocha/**/*.spec.js"',
      'mocha-unit-api': 'UNIT_TEST_ENV=1 ./node_modules/mocha/bin/_mocha "api/tests/mocha/**/*.js"',
      'mocha-unit-sentinel': 'UNIT_TEST_ENV=1 ./node_modules/mocha/bin/_mocha "sentinel/tests/**/*.js"',
      'mocha-integration-api': './node_modules/mocha/bin/_mocha "api/tests/integration/**/*.js" -t 10000',
      'optimize-js':
        './node_modules/optimize-js/lib/bin.js api/build/static/admin/js/main.js > api/build/static/admin/js/main.op.js && ' +
        './node_modules/optimize-js/lib/bin.js api/build/static/admin/js/templates.js > api/build/static/admin/js/templates.op.js && ' +
        'mv api/build/static/admin/js/main.op.js api/build/static/admin/js/main.js && ' +
        'mv api/build/static/admin/js/templates.op.js api/build/static/admin/js/templates.js',
      'jsdoc-admin': './node_modules/jsdoc/jsdoc.js -d jsdocs/admin -c node_modules/angular-jsdoc/common/conf.json -t node_modules/angular-jsdoc/angular-template admin/src/js/**/*.js',
      'jsdoc-sentinel': './node_modules/jsdoc/jsdoc.js -d jsdocs/sentinel sentinel/src/**/*.js',
      'jsdoc-api': './node_modules/jsdoc/jsdoc.js -d jsdocs/api -R api/README.md api/src/**/*.js',
      'jsdoc-shared-libs': './node_modules/jsdoc/jsdoc.js -d jsdocs/shared-libs shared-libs/**/src/**/*.js',
      'less': './node_modules/less/bin/lessc admin/src/css/main.less api/build/static/admin/css/main.css',
      'browserify-admin': 'mkdir -p api/build/static/admin/js/ && ' +
        'node ./node_modules/browserify/bin/cmd.js ' +
        '--debug ' +
        '-t browserify-ngannotate ' +
        '-r "./admin/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat:angular-translate-interpolation-messageformat" ' +
        '-r "./admin/node_modules/google-libphonenumber:google-libphonenumber" ' +
        '-r "./admin/node_modules/gsm:gsm" ' +
        '-r "./admin/node_modules/object-path:object-path" ' +
        '-r "./admin/node_modules/bikram-sambat:bikram-sambat" ' +
        '-r "./admin/node_modules/lodash/core:lodash/core" ' +
        'admin/src/js/main.js > api/build/static/admin/js/main.js',
      'compile-admin-templates':
        'mkdir -p api/build/static/admin/js/ && ' +
        'node ./scripts/build/build-angularjs-template-cache.js',
      'cleancss-admin':
        './node_modules/clean-css-cli/bin/cleancss api/build/static/admin/css/main.css > api/build/static/admin/css/main.min.css && ' +
        'mv api/build/static/admin/css/main.min.css api/build/static/admin/css/main.css',
      'cleancss-api':
        './node_modules/clean-css-cli/bin/cleancss api/build/static/login/style.css > api/build/static/login/style.min.css && ' +
        'mv api/build/static/login/style.min.css api/build/static/login/style.css',
      'karma-admin': 'node ./scripts/ci/run-karma.js',
      'copy-ddocs': 'mkdir -p build/ddocs && cp -r ddocs/* build/ddocs/',
      'copy-api-ddocs': 'mkdir -p api/build/ddocs && cp build/ddocs/*.json api/build/ddocs/',
      'copy-webapp-static':
        'cp -r webapp/src/audio api/build/static/webapp/ && ' +
        'cp -r webapp/src/fonts api/build/static/webapp/ && ' +
        'cp -r webapp/src/img api/build/static/webapp/',
      'copy-api-resources': 'cp -r api/src/public/* api/build/static/',
      'copy-api-bowser': 'cp api/node_modules/bowser/bundled.js api/src/public/login/lib-bowser.js',
      'copy-admin-static':
        'cp admin/src/templates/index.html api/build/static/admin/ && ' +
        'mkdir -p api/build/static/admin/fonts/ && ' +
        'cp admin/node_modules/font-awesome/fonts/* api/build/static/admin/fonts/ && ' +
        'cp webapp/src/fonts/* api/build/static/admin/fonts/',
      'enketo-css': 'node node_modules/sass/sass.js webapp/src/css/enketo/enketo.scss api/build/static/webapp/enketo.less --no-source-map',
      'eslint': ESLINT_COMMAND + ' .',
      'eslint-sw': `${ESLINT_COMMAND} -c ./.eslintrc build/service-worker.js`,
      'watch': 'node ./scripts/build/watch.js',
      'build-service-images': {
        cmd: () => buildVersions.SERVICES
          .map(service =>
            [
              `cd ${service}`,
              `npm ci --production`,
              `npm dedupe`,
              `cd ../`,
              `docker build -f ./${service}/Dockerfile --tag ${buildVersions.getImageTag(service)} .`,
            ].join(' && '))
          .join(' && '),
      },
      'build-images': {
        cmd: () => buildVersions.INFRASTRUCTURE
          .map(service =>
            [
              `cd ${service}`,
              `docker build -f ./Dockerfile --tag ${buildVersions.getImageTag(service)} .`,
              'cd ../',
            ].join(' && '))
          .join(' && '),
      },
      'save-service-images': {
        cmd: () => [...buildVersions.SERVICES, ...buildVersions.INFRASTRUCTURE]
          .map(service =>
            [
              `mkdir -p images`,
              `docker save ${buildVersions.getImageTag(service)} > images/${service}.tar`,
            ].join(' && '))
          .join(' && '),
      },
      'push-service-images': {
        cmd: () => [...buildVersions.SERVICES, ...buildVersions.INFRASTRUCTURE]
          .map(service => `docker push ${buildVersions.getImageTag(service)}`)
          .join(' && '),
      },
      'api-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --inspect=0.0.0.0:9229 --ignore "api/build/static" --ignore "api/build/public" --watch api --watch "shared-libs/**/src/**" api/server.js -- --allow-cors',
      },
      'sentinel-dev': {
        cmd:
          'TZ=UTC ./node_modules/.bin/nodemon --inspect=0.0.0.0:9228 --watch sentinel --watch "shared-libs/**/src/**" sentinel/server.js',
      },
      'blank-link-check': {
        cmd: `echo "Checking for dangerous _blank links..." &&
               ! (git grep -E  'target\\\\?="_blank"' -- webapp/src admin/src |
                      grep -Ev 'target\\\\?="_blank" rel\\\\?="noopener noreferrer"' |
                      grep -Ev '^\\s*//' &&
                  echo 'ERROR: Links found with target="_blank" but no rel="noopener noreferrer" set.  Please add required rel attribute.')`,
      },
      bundlesize: 'node ./node_modules/bundlesize/index.js',
      'npm-ci-api': 'cd api && npm ci',
      'npm-ci-modules': 'node scripts/build/cli npmCiModules',
      'check-env-vars':
        'if [ -z $COUCH_URL ]; then ' +
        'echo "Missing required env var.  Check that all are set: ' +
        'COUCH_URL" && exit 1; fi',
      'check-version': `node scripts/ci/check-versions.js`,
      'test-config-standard': {
        cmd: 'cd config/standard && npm ci && npm run ci',
        stdio: 'inherit', // enable colors!
      },
      'wdio-run-default': {
        cmd: 'npm run wdio -- --suite=' + grunt.option('suite'),
        stdio: 'inherit', // enable colors!
      },
      'wdio-run-standard': {
        cmd: 'npm run standard-wdio -- --suite=' + grunt.option('suite'),
        stdio: 'inherit', // enable colors!
      },
      'wdio-run-default-mobile': {
        cmd: 'npm run default-wdio-mobile -- --suite=' + grunt.option('suite'),
        stdio: 'inherit', // enable colors!
      },
      'test-config-default': {
        cmd: 'cd config/default && npm ci && npm run test',
        stdio: 'inherit', // enable colors!
      },
      'shared-lib-unit': {
        cmd: 'UNIT_TEST_ENV=1 npm test --workspaces --if-present',
        stdio: 'inherit', // enable colors!
      },
      audit: 'node ./scripts/audit-all.js',
      'audit-allowed-list': 'git diff $(cat .auditignore | git hash-object -w --stdin) $(node ./scripts/audit-all.js | git hash-object -w --stdin) --word-diff --exit-code',
      'build-config': {
        cmd: () => {
          const medicConfPath = path.resolve('./node_modules/medic-conf/src/bin/medic-conf.js');
          const configPath = path.resolve('./config/default');
          const buildPath = path.resolve('./api/build/default-docs');
          const actions = ['upload-app-settings', 'upload-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-resources', 'upload-custom-translations'];
          return `node ${medicConfPath} --skip-dependency-check --archive --source=${configPath} --destination=${buildPath} ${actions.join(' ')}`;
        }
      },
      'build-webapp': {
        cmd: () => {
          const configuration = DEV ? 'development' : 'production';
          return [
            `cd webapp`,
            `../node_modules/.bin/ng build --configuration=${configuration} --progress=${DEV ? 'true' : 'false'}`,
            `../node_modules/.bin/ngc`,
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      'watch-webapp': {
        cmd: () => {
          const configuration = DEV ? 'development' : 'production';
          return `
            cd webapp && ../node_modules/.bin/ng build --configuration=${configuration} --watch=true &
            cd ../
          `;
        },
        stdio: 'inherit', // enable colors!
      },
      'unit-webapp': {
        cmd: () => {
          return [
            'cd webapp',
            `UNIT_TEST_ENV=1 ../node_modules/.bin/ng test webapp --watch=false --progress=${DEV ? 'true' : 'false'}`,
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      'unit-webapp-continuous': {
        cmd: () => {
          return [
            'cd webapp',
            'UNIT_TEST_ENV=1 ../node_modules/.bin/ng test webapp --watch=true --progress=true',
            'cd ../',
          ].join(' && ');
        },
        stdio: 'inherit', // enable colors!
      },
      //using npm run, as 'grunt-mocha-test' has issues with the integration with newer versions of mocha.
      'e2e-integration': 'npm run e2e-integration'
    }
  });

  // Build tasks
  grunt.registerTask('install-dependencies', 'Update and patch dependencies', [
    'exec:npm-ci-modules',
  ]);

  grunt.registerTask('build-webapp', 'Build webapp resources', [
    'build-enketo-css',
    'exec:build-webapp',
  ]);

  grunt.registerTask('build-enketo-css', 'Build Enketo css', [
    'exec:enketo-css',
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'build-webapp',
    //'exec:bundlesize', // bundlesize only checks webapp build files
    'build-admin',
    'build-config',
    'create-staging-doc',
    'populate-staging-doc',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'build-webapp',
    'build-admin',
    'build-config',
    'copy-static-files-to-api',
    'exec:copy-api-ddocs', // probably not needed - we do this in "build-ddocs" anyway
  ]);

  grunt.registerTask('copy-static-files-to-api', 'Copy build files and static files to api', [
    'exec:copy-api-bowser',
    'exec:copy-api-resources',
    'exec:copy-webapp-static',
    'exec:copy-admin-static',
  ]);

  grunt.registerTask('set-build-info', buildUtils.setBuildInfo);

  grunt.registerTask('build-ddocs', 'Builds the ddocs', [
    'exec:copy-ddocs',
    'set-ddocs-version',
    'set-build-info',
    'exec:compile-ddocs-primary',
    'exec:copy-api-ddocs',
  ]);

  grunt.registerTask('build-config', 'Build default configuration', [
    'exec:build-config',
  ]);

  grunt.registerTask('build-admin', 'Build the admin app', [
    'exec:compile-admin-templates',
    'exec:browserify-admin',
    'exec:less',
    'minify-admin',
  ]);

  grunt.registerTask('build-service-images', 'Build api and sentinel images', [
    'copy-static-files-to-api',
    'exec:uglify-api',
    'exec:cleancss-api',
    'exec:build-service-images',
    'exec:build-images',
  ]);

  grunt.registerTask('e2e-env-setup', 'Deploy app for testing', [
    'build-service-images',
  ]);

  grunt.registerTask('e2e-integration', 'Deploy app for testing', [
    'e2e-env-setup',
    'exec:e2e-integration',
    'exec:eslint-sw'
  ]);

  grunt.registerTask('unit-webapp', 'Run webapp unit test after installing dependencies.', [
    'install-dependencies',
    'exec:unit-webapp'
  ]);

  grunt.registerTask('unit-webapp-no-dependencies', 'Run webapp unit test, without reinstalling dependencies.', [
    'exec:unit-webapp'
  ]);

  grunt.registerTask('unit-admin', 'Build and run admin unit tests', [
    'exec:karma-admin',
  ]);

  grunt.registerTask('unit-webapp-continuous', 'Run webapp unit test in a loop, without reinstalling dependencies.', [
    'exec:unit-webapp-continuous'
  ]);

  grunt.registerTask('test-api-integration', 'Integration tests for api', [
    'exec:check-env-vars',
    'exec:npm-ci-api',
    'exec:mocha-integration-api',
  ]);

  grunt.registerTask('unit', 'Unit tests', [
    'unit-webapp-no-dependencies',
    'unit-admin',
    'exec:shared-lib-unit',
    'exec:mocha-unit-webapp',
    'exec:mocha-unit-api',
    'exec:mocha-unit-sentinel',
  ]);

  grunt.registerTask('unit-api', 'API unit tests', [
    'exec:mocha-unit-api',
  ]);

  grunt.registerTask('unit-sentinel', 'Sentinel unit tests', [
    'exec:mocha-unit-sentinel',
  ]);

  // CI tasks
  grunt.registerTask('minify-admin', 'Minify Admin JS and CSS', DEV ? [] : [
    'exec:uglify-admin',
    'exec:optimize-js',
    'exec:cleancss-admin',
  ]);

  grunt.registerTask('ci-compile-github', 'build, lint, unit, integration test', [
    'exec:check-version',
    'install-dependencies',
    'static-analysis',
    'build',
    'exec:mocha-integration-api',
    'unit',
  ]);

  grunt.registerTask('ci-e2e-integration', 'Run e2e tests for CI', [
    'exec:e2e-integration',
    'exec:eslint-sw',
  ]);

  grunt.registerTask('ci-webdriver-default', 'Run e2e tests using webdriverIO for default config', [
    'exec:wdio-run-default'
  ]);

  grunt.registerTask('ci-webdriver-standard', 'Run e2e tests using webdriverIO for standard config', [
    'exec:wdio-run-standard'
  ]);

  grunt.registerTask('ci-webdriver-default-mobile', 'Run e2e tests using webdriverIO for default config in mobile screen', [
    'exec:wdio-run-default-mobile'
  ]);

  // Dev tasks
  grunt.registerTask('dev-webapp', 'Build and deploy the webapp for dev', [
    'install-dependencies',
    'dev-webapp-no-dependencies',
  ]);

  grunt.registerTask('static-analysis', 'Static analysis checks', [
    'exec:blank-link-check',
    'eslint',
  ]);

  grunt.registerTask('eslint', 'Runs eslint', [
    'exec:eslint'
  ]);

  grunt.registerTask('dev-webapp-no-dependencies', 'Build and deploy the webapp for dev, without reinstalling dependencies.', [
    'build-dev',
    'exec:watch-webapp',
    'exec:watch',
  ]);

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'exec:copy-api-bowser',
    'exec:api-dev',
  ]);

  grunt.registerTask('secure-couchdb', 'Basic developer setup for CouchDB', [
    'exec:setup-admin',
  ]);

  grunt.registerTask('dev-sentinel', 'Run sentinel and watch for file changes', [
    'exec:sentinel-dev',
  ]);

  grunt.registerTask('create-staging-doc', buildUtils.createStagingDoc);
  grunt.registerTask('populate-staging-doc', buildUtils.populateStagingDoc);
  grunt.registerTask('create-local-docker-compose-files', buildUtils.localDockerComposeFiles);
  grunt.registerTask('update-service-worker', function () {
    const done = this.async();
    buildUtils.updateServiceWorker().then(done);
  });
  grunt.registerTask('set-ddocs-version', buildUtils.setDdocsVersion);

  grunt.registerTask('publish-service-images', 'Publish service images', (() => {
    if (!BUILD_NUMBER) {
      return [];
    }

    if (INTERNAL_CONTRIBUTOR) {
      return ['exec:push-service-images'];
    }

    return ['exec:save-service-images'];
  })());

  grunt.registerTask('publish-for-testing', 'Build and publish service images, publish the staging doc to the testing server', [
    'build-service-images',
    'publish-service-images',
    'exec:compile-ddocs-staging',
    'exec:push-ddoc-to-staging',
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp',
  ]);

  grunt.registerTask('build-documentation', 'Build documentation using jsdoc', [
    'exec:jsdoc-admin',
    'exec:jsdoc-api',
    'exec:jsdoc-sentinel',
    'exec:jsdoc-shared-libs',
  ]);
};
