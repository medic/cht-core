module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    nodeunit: {
      all: ['tests/**/*.js']
    },
    jshint: {
      options: {
        jshintrc: true,
        ignores: [
          'node_modules/**'
        ]
      },
      all: [
        '**/*.js'
      ]
    },
    env: {
      test: {
        options: {
          add: {
            TEST_ENV: '1'
          }
        }
      },
      dev: {
        options: {
          replace: {
            TEST_ENV: ''
          }
        }
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-env');

  // Default tasks
  grunt.registerTask('test', [
    'env:test',
    'jshint',
    'nodeunit',
    'env:dev'
  ]);

};