/* eslint-disable max-len */

const path = require('path');

const {
  BUILD_NUMBER,
  INTERNAL_CONTRIBUTOR,
} = process.env;

const DEV = !BUILD_NUMBER;

const buildUtils = require('./scripts/build');
const buildVersions = require('./scripts/build/versions');

module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-exec');

  // Project configuration
  grunt.initConfig({
    exec: {
      'compile-ddocs-primary': 'node ./scripts/build/ddoc-compile.js primary',
      'compile-ddocs-staging': 'node ./scripts/build/ddoc-compile.js staging',

      'push-ddoc-to-staging': 'node ./scripts/build/push-ddoc-to-staging.js',
      'clean-build-dir': 'rm -rf build && mkdir build',
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
      'copy-webapp-static': 'cp -r webapp/src/audio webapp/src/fonts webapp/src/img api/build/static/webapp/',
      'copy-api-resources': 'cp -r api/src/public/* api/build/static/',
      'copy-api-bowser': 'cp api/node_modules/bowser/bundled.js api/src/public/login/lib-bowser.js',
      'copy-admin-static': 'cp -r admin/src/templates/index.html admin/node_modules/font-awesome/fonts webapp/src/fonts api/build/static/admin',


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
      'npm-ci-modules': 'node scripts/build/cli npmCiModules',
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
      'build-config': {
        cmd: () => {
          const medicConfPath = path.resolve('./node_modules/medic-conf/src/bin/medic-conf.js');
          const configPath = path.resolve('./config/default');
          const buildPath = path.resolve('./api/build/default-docs');
          const actions = ['upload-app-settings', 'upload-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-resources', 'upload-custom-translations'];
          return `node ${medicConfPath} --skip-dependency-check --archive --source=${configPath} --destination=${buildPath} ${actions.join(' ')}`;
        }
      },

      //using npm run, as 'grunt-mocha-test' has issues with the integration with newer versions of mocha.
      'e2e-integration': 'npm run e2e-integration',


      // CONVERTED TO PACKAGE.JSON
      'npm-ci-api': 'cd api && npm ci',
      'npm-run-lint': 'npm run lint',
      'build-webapp': 'cd webapp && npm run build -- --configuration=production && npm run compile',
      'build-webapp-dev': 'cd webapp && npm run build -- --configuration=development && npm run compile',
      'watch-webapp': 'cd webapp && npm run build -- --configuration=development --watch=true & node ./scripts/build/watch.js',
      'unit-webapp': 'cd webapp && npm run unit -- --watch=false',
      'unit-webapp-continuous': 'cd webapp && npm run unit -- --watch=true',
      'mocha-unit-webapp': 'npm run mocha-unit-webapp',
      'mocha-unit-api': 'npm run mocha-unit-api',
      'mocha-unit-sentinel': 'npm run mocha-unit-sentinel',
      'mocha-integration-api': 'npm run mocha-integration-api',
      'jsdoc-admin': 'npm run jsdoc-admin',
      'jsdoc-sentinel': 'npm run jsdoc-sentinel',
      'jsdoc-api': 'npm run jsdoc-api',
      'jsdoc-shared-libs': 'npm run jsdoc-shared-libs',
      'dev-api': 'npm run dev-api',
      'dev-sentinel': 'npm run dev-sentinel',
      'enketo-css': 'npm run css-enketo',
      'eslint-sw': 'npm run lint-service-worker',
      'less': 'npm run css-admin',
      'browserify-admin': 'npm run browserify-admin',
      'uglify-api': 'npm run uglify-api',
      'uglify-admin': 'npm run uglify-admin',
    }
  });

  // Build tasks
  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'exec:enketo-css',
    'exec:build-webapp',
    'build-admin',
    'exec:build-config',
    'create-staging-doc',
    'populate-staging-doc',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'exec:enketo-css',
    'exec:build-webapp-dev',
    'build-admin',
    'exec:build-config',
    'copy-static-files-to-api',
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
    'exec:npm-ci-modules',
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
    'exec:cleancss-admin',
  ]);

  grunt.registerTask('ci-compile-github', 'build, lint, unit, integration test', [
    'exec:check-version',
    'exec:npm-ci-modules',
    'exec:npm-run-lint',
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
  grunt.registerTask('dev-webapp', 'Build and deploy the webapp for dev, without reinstalling dependencies.', [
    'exec:npm-ci-modules',
    'exec:clean-build-dir',
    'build-ddocs',
    'exec:enketo-css',
    'build-admin',
    'exec:build-config',
    'copy-static-files-to-api',
    'exec:watch-webapp',
  ]);

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'exec:copy-api-bowser',
    'exec:dev-api',
  ]);

  grunt.registerTask('dev-sentinel', 'Run sentinel and watch for file changes', [
    'exec:dev-sentinel',
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
