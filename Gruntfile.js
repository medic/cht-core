/* eslint-disable max-len */

const path = require('path');

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

      'karma-admin': 'node ./scripts/ci/run-karma.js',
      'copy-ddocs': 'mkdir -p build/ddocs && cp -r ddocs/* build/ddocs/',
      'copy-api-ddocs': 'mkdir -p api/build/ddocs && cp build/ddocs/*.json api/build/ddocs/',
      'copy-webapp-static': 'cp -r webapp/src/audio webapp/src/fonts webapp/src/img api/build/static/webapp/',
      'copy-api-resources': 'cp -r api/src/public/* api/build/static/',
      'copy-admin-static': 'cp -r admin/src/templates/index.html admin/node_modules/font-awesome/fonts webapp/src/fonts api/build/static/admin',

      'npm-ci-modules': 'node scripts/build/cli npmCiModules',
      'check-version': 'node scripts/ci/check-versions.js',
      'build-service-images': 'node scripts/build/cli buildServiceImages',
      'build-images': 'node scripts/build/cli buildImages',
      'publish-service-images': 'mkdir -p images && node scripts/build/cli publishServiceImages',

      // 'build-config': {
      //   cmd: () => {
      //     const medicConfPath = path.resolve('./node_modules/medic-conf/src/bin/medic-conf.js');
      //     const configPath = path.resolve('./config/default');
      //     const buildPath = path.resolve('./api/build/default-docs');
      //     const actions = ['upload-app-settings', 'upload-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-resources', 'upload-custom-translations'];
      //     return `node ${medicConfPath} --skip-dependency-check --archive --source=${configPath} --destination=${buildPath} ${actions.join(' ')}`;
      //   }
      // },

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
      'dev-api': 'npm run dev-api',
      'enketo-css': 'npm run css-enketo',
      'eslint-sw': 'npm run lint-service-worker',
      'less': 'npm run css-admin',
      'browserify-admin': 'npm run browserify-admin',
      'uglify-api': 'npm run uglify-api',
      'uglify-admin': 'npm run uglify-admin',
      'test-config-standard': 'npm run test-config-standard',
      'test-config-default': 'npm run test-config-default',
      'shared-lib-unit': 'npm run shared-lib-unit',
      'cleancss-admin': 'npm run cleancss-admin',
      'cleancss-api': 'npm run cleancss-api',
      'build-config': 'npm run build-config',
      'copy-api-bowser': 'npm run copy-api-bowser',
      'create-staging-doc': 'npm run create-staging-doc',
      'populate-staging-doc': 'npm run populate-staging-doc',
      'create-local-docker-compose-files': 'npm run create-local-docker-compose-files',
      'update-service-worker': 'npm run update-service-worker',
      'set-ddocs-version': 'npm run set-ddocs-version',
      'set-build-info': 'npm run set-build-info'
    }
  });

  // Build tasks
  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-build-dir',
    'build-ddocs',
    'exec:enketo-css',
    'exec:build-webapp',
    'build-admin',
    'exec:uglify-admin',
    'exec:cleancss-admin',
    'exec:build-config',
    'exec:create-staging-doc',
    'exec:populate-staging-doc',
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

  grunt.registerTask('build-ddocs', 'Builds the ddocs', [
    'exec:copy-ddocs',
    'exec:set-ddocs-version',
    'exec:set-build-info',
    'exec:compile-ddocs-primary',
    'exec:copy-api-ddocs',
  ]);

  grunt.registerTask('build-admin', 'Build the admin app', [
    'exec:compile-admin-templates',
    'exec:browserify-admin',
    'exec:less',
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


  grunt.registerTask('ci-compile-github', 'build, lint, unit, integration test', [
    'exec:check-version',
    'exec:npm-ci-modules',
    'exec:npm-run-lint',
    'build',
    'exec:mocha-integration-api',
    'unit',
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

  grunt.registerTask('publish-for-testing', 'Build and publish service images, publish the staging doc to the testing server', [
    'build-service-images',
    'exec:publish-service-images',
    'exec:compile-ddocs-staging',
    'exec:push-ddoc-to-staging',
  ]);
};
