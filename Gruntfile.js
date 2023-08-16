/* eslint-disable max-len */

module.exports = function(grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-exec');

  // Project configuration
  grunt.initConfig({
    exec: {
      // CONVERTED TO PACKAGE.JSON
      'compile-ddocs-primary': 'npm run compile-ddocs-primary',
      'compile-ddocs-staging': 'npm run compile-ddocs-staging',

      'push-ddoc-to-staging': 'npm run push-ddoc-to-staging',
      'clean-build-dir': 'npm run clean-build-dir',
      'compile-admin-templates': 'npm run compile-admin-templates',

      'karma-admin': 'npm run karma-admin',
      'copy-ddocs': 'npm run copy-ddocs',
      'copy-api-ddocs': 'npm run copy-api-ddocs',
      'copy-webapp-static': 'npm run copy-webapp-static',
      'copy-api-resources': 'npm run copy-api-resources',
      'copy-admin-static': 'npm run copy-admin-static',

      'npm-ci-modules': 'npm run npm-ci-modules',
      'check-version': 'npm run check-version',
      'build-service-images': 'npm run build-service-images',
      'build-images': 'npm run build-images',
      'publish-service-images': 'npm run publish-service-images',
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
