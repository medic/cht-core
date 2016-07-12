module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    nodeunit: {
      all: [
        'tests/**/*.js',
        '!tests/utils.js'
      ]
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
    },
    exec: {
      deploy: {
        cmd: 'node server.js'
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-exec');

  // Default tasks
  grunt.registerTask('test', [
    'env:test',
    'jshint',
    'nodeunit',
    'env:dev'
  ]);

  grunt.registerTask('deploy', [
    'exec:deploy'
  ]);
};