module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    nodeunit: {
      all: [
        'tests/unit/**/*.js',
        '!tests/unit/utils.js',
        '!tests/unit/integration/**/*.js',
        '!tests/unit/e2e/**/*.js'
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
      },
      check_env_vars:
        'if [ -z $COUCH_URL ] || [ -z $API_URL ] || [ -z $COUCH_NODE_NAME ]; then ' +
            'echo "Missing required env var.  Check that all are set: ' +
            'COUCH_URL, API_URL, COUCH_NODE_NAME" && exit 1; fi',
    },
    mochaTest: {
      integration: {
        src: ['tests/integration/**/*.js'],
        options: {
          timeout: 10000
        }
      },
      e2e: {
        src: ['tests/e2e/**/*.js'],
        options: {
          timeout: 20000,
        },
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
    'test_e2e',
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
    'exec:check_env_vars',
    'mochaTest:integration',
  ]);

  grunt.registerTask('test_e2e', [
    'exec:check_env_vars',
    'mochaTest:e2e',
  ]);
};
