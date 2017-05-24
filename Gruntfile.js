module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    nodeunit: {
      all: [
        'test/unit/**/*.js',
        'test/functional/**/*.js'
      ]
    },
    jshint: {
      options: {
        jshintrc: true,
        ignores: [
          'node_modules/**',
          'lib/pupil/**'
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

  grunt.registerTask('unit', [
    'env:test',
    'nodeunit',
    'env:dev'
  ]);

  grunt.registerTask('test', [
    'jshint',
    'unit'
  ]);

  // Default tasks
  grunt.registerTask('default', [
    'test'
  ]);

};
