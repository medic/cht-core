module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    nodeunit: {
      all: [
        'tests/**/*.js',
        '!tests/utils.js',
        '!tests/integration/**/*.js'
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
            UNIT_TEST_ENV: '1'
          }
        }
      },
      dev: {
        options: {
          replace: {
            UNIT_TEST_ENV: ''
          }
        }
      }
    },
    exec: {
      deploy: {
        cmd: 'node server.js'
      }
    },
    mochaTest: {
      integration: {
        src: ['tests/integration/**/*.js'],
      },
    },
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-mocha-test');

  // Default tasks
  grunt.registerTask('test', [
    'jshint',
    'test_unit',
    'test_integration',
  ]);

  grunt.registerTask('deploy', [
    'exec:deploy'
  ]);

  // Non-default tasks
  grunt.registerTask('ci', [
    'jshint',
    'test_unit',
    // don't run integration tests on CI - they will run from the webapp project
  ]);

  grunt.registerTask('test_unit', [
    'env:test',
    'nodeunit',
    'env:dev',
  ]);

  grunt.registerTask('test_integration', [
    'mochaTest:integration',
  ]);
};
