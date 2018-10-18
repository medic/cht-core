var kansoJson = require('./kanso.json');

module.exports = function(grunt) {

  'use strict';

  require('jit-grunt')(grunt, {
    'couch-compile': 'grunt-couch',
    'ngtemplates': 'grunt-angular-templates',
    'protractor': 'grunt-protractor-runner',
    'replace': 'grunt-text-replace',
  });
  require('time-grunt')(grunt);

  // Project configuration
  grunt.initConfig({
    replace: {
      hardcodeappsettings: {
        src: [ 'static/dist/inbox.js' ],
        overwrite: true,
        replacements: [{
          from: /@@APP_CONFIG.version/g,
          to: kansoJson.version
        }, {
          from: /@@APP_CONFIG.name/g,
          to: kansoJson.name
        }]
      }
    },
    'couch-compile': {
      ddocs: {
        files: {
          'ddocs/compiled.json': [ 'ddocs/*', '!ddocs/compiled.json' ]
        }
      }
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true
        }
      },
      dist: {
        src: ['static/js/app.js'],
        dest: 'static/dist/inbox.js',
        browserifyOptions: {
          detectGlobals: false
        },
        options: {
          transform: ['browserify-ngannotate'],
          alias: {
            'db': './packages/db/db',
            'cookies': './packages/cookies/cookies',
            'session': './packages/session/session',
            'enketo-config': './static/js/enketo/config.json',
            'widgets': './static/js/enketo/widgets',
            './xpath-evaluator-binding':'./static/js/enketo/OpenrosaXpathEvaluatorBinding',
            'extended-xpath': './node_modules/openrosa-xpath-evaluator/src/extended-xpath',
            'openrosa-xpath-extensions': './node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
            'translator': './static/js/enketo/translator', // translator for enketo's internal i18n
            '../../js/dropdown.jquery': 'bootstrap/js/dropdown', // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream https://github.com/enketo/enketo-core/issues/454
            'libphonenumber/utils': './packages/libphonenumber/libphonenumber/utils',
            'libphonenumber/libphonenumber': './packages/libphonenumber/libphonenumber/libphonenumber',
            'angular-translate-interpolation-messageformat': './node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
            'angular-translate-handler-log':  './node_modules/angular-translate/dist/angular-translate-handler-log/angular-translate-handler-log',
          },
        },
      }
    },
    uglify: {
      options: {
        banner: '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          'static/dist/templates.js': ['static/dist/templates.js'],
          'static/dist/inbox.js': ['static/dist/inbox.js'],
        }
      }
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
    jshint: {
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish'),
        ignores: [
          'static/js/modules/xpath-element-path.js',
          'tests/karma/q.js',
          '**/node_modules/**',
          'sentinel/lib/pupil/**',
        ]
      },
      all: [
        'Gruntfile.js',
        'static/js/**/*.js',
        'tests/**/*.js',
        'ddocs/**/*.js',
        'lib/**/*.js',
        'api/**/*.js',
        'sentinel/**/*.js',
        'shared-libs/**/*.js',
      ]
    },
    less: {
      all: {
        files: {
          'static/dist/inbox.css': 'static/css/inbox.less'
        }
      }
    },
    cssmin: {
      all: {
        options: {
          keepSpecialComments: 0
        },
        files: {
          'static/dist/inbox.css': 'static/dist/inbox.css'
        }
      }
    },
    postcss: {
      options: {
        processors: [
          require('autoprefixer')({ browsers: [
            'last 2 versions',
            'Android >= 4.4'
          ] })
        ]
      },
      dist: {
        src: 'static/dist/*.css'
      }
    },
    copy: {
      inbox: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [ 'node_modules/font-awesome/fonts/*' ],
            dest: 'static/fonts'
          }
        ]
      },
      librariestopatch: {
        files: [
          {
            expand: true,
            cwd: 'node_modules',
            src: [
              'bootstrap-daterangepicker/**',
              'enketo-core/**',
              'font-awesome/**',
              'moment/**',
              'pouchdb-browser/**',
            ],
            dest: 'node_modules_backup'
          }
        ]
      },
      libphonenumber: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [ 'node_modules/google-libphonenumber/dist/libphonenumber.js' ],
            dest: 'packages/libphonenumber/libphonenumber/'
          }
        ]
      },
      enketoxslt: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [ 'node_modules/medic-enketo-xslt/xsl/*.xsl' ],
            dest: 'static/dist/xslt/'
          }
        ]
      },
      taskutils: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [ 'shared-libs/task-utils/src/task-utils.js' ],
            dest: 'packages/task-utils/'
          }
        ]
      }
    },
    exec: {
      apiDev: {
        cmd: 'TZ=UTC ./node_modules/.bin/nodemon --watch api api/server.js'
      },
      sentinelDev: {
        cmd: 'TZ=UTC ./node_modules/.bin/nodemon --watch sentinel sentinel/server.js'
      },
      blankLinkCheck: {
        cmd: `echo "Checking for dangerous _blank links..." &&
               ! (git grep -E  'target\\\\?="_blank"' -- templates/ translations/ static/ |
                      grep -Ev 'target\\\\?="_blank" rel\\\\?="noopener noreferrer"' |
                      grep -Ev '^\s*//' &&
                  echo 'ERROR: Links found with target="_blank" but no rel="noopener noreferrer" set.  Please add required rel attribute.')`,
      },
      deploy: {
        cmd: 'kanso push $COUCH_URL'
      },
      setupAdmin1: {
        cmd: 'curl -X PUT http://localhost:5984/_config/admins/admin -d \'"pass"\'' +
             ' && curl -X POST http://admin:pass@localhost:5984/_users ' +
                 ' -H "Content-Type: application/json" ' +
                 ' -d \'{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}\' ' +
             ' && curl -X PUT --data \'"true"\' http://admin:pass@localhost:5984/_config/couch_httpd_auth/require_valid_user'
      },
      setupAdmin2: {
        cmd: 'curl -X PUT http://localhost:5984/_node/${COUCH_NODE_NAME}/_config/admins/admin -d \'"pass"\'' +
             ' && curl -X POST http://admin:pass@localhost:5984/_users ' +
                 ' -H "Content-Type: application/json" ' +
                 ' -d \'{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}\' ' +
             ' && curl -X PUT --data \'"true"\' http://admin:pass@localhost:5984/_node/${COUCH_NODE_NAME}/_config/chttpd/require_valid_user'
      },
      deploytest: {
        stderr: false,
        cmd: 'cd api && npm install --only=prod --no-package-lock && cd .. ' +
             ' && cd sentinel && npm install --only=prod --no-package-lock && cd .. ' +
             ' && curl -X DELETE http://admin:pass@localhost:5984/medic-test' +
             ' && curl -X DELETE http://admin:pass@localhost:5984/medic-audit-test' +
             ' && kanso push http://admin:pass@localhost:5984/medic-test'
      },
      bundlesize: {
        cmd: 'node ./node_modules/bundlesize/index.js'
      },
      setup_api_integration: {
        cmd: 'cd api && npm install',
      },
      check_env_vars:
        'if [ -z $COUCH_URL ] || [ -z $API_URL ] || [ -z $COUCH_NODE_NAME ]; then ' +
            'echo "Missing required env var.  Check that all are set: ' +
            'COUCH_URL, API_URL, COUCH_NODE_NAME" && exit 1; fi',
      undopatches: {
        cmd: function() {
          var modulesToPatch = [
            'bootstrap-daterangepicker',
            'enketo-core',
            'font-awesome',
            'moment',
            'pouchdb-browser',
          ];
          return modulesToPatch.map(function(module) {
            var backupPath = 'node_modules_backup/' + module;
            var modulePath = 'node_modules/' + module;
            return '[ -d ' + backupPath + ' ]' +
                   ' && rm -rf ' + modulePath +
                   ' && mv ' + backupPath + ' ' + modulePath +
                   ' && echo "Module restored: ' + module + '"' +
                   ' || echo "No restore required for: ' + module + '"';
          }).join(' & ');
        }
      },
      sharedLibUnit: {
        cmd:  function() {
          var sharedLibs = [
            //'bulk-docs-utils',
            'search',
            'task-utils'
          ];
          return sharedLibs.map(function(lib) {
            return 'cd shared-libs/' + lib +
              ' && if [ $(npm run | grep "^\\s\\stest$" | wc -l) -gt 0 ]; then npm install && npm test; fi' +
              ' && cd ../../';
          }).join(' && ');
        }
      },
      // To monkey patch a library...
      // 1. copy the file you want to change
      // 2. make the changes
      // 3. run `diff -c original modified > patches/my-patch.patch`
      // 4. update grunt targets: "applypatches", "undopatches", and "librariestopatch"
      applypatches: {
        cmd: function() {
          var patches = [
            // patch the daterangepicker for responsiveness
            // https://github.com/dangrossman/bootstrap-daterangepicker/pull/437
            'patch node_modules/bootstrap-daterangepicker/daterangepicker.js < patches/bootstrap-daterangepicker.patch',

            // patch font-awesome to remove version attributes so appcache works
            // https://github.com/FortAwesome/Font-Awesome/issues/3286
            'patch node_modules/font-awesome/less/path.less < patches/font-awesome-remove-version-attribute.patch',

            // patch moment.js to use western arabic (european) numerals in Hindi
            'patch node_modules/moment/locale/hi.js < patches/moment-hindi-use-euro-numerals.patch',

            // patch pouch to:
            // * ignore doc_ids when generating replication id (https://github.com/medic/medic-webapp/issues/2404)
            // * improve safari checks (https://github.com/medic/medic-webapp/issues/2797)
            'patch node_modules/pouchdb-browser/lib/index.js < patches/pouchdb-browser.patch',

            // patch enketo to always mark the /inputs group as relevant
            'patch node_modules/enketo-core/src/js/Form.js < patches/enketo-inputs-always-relevant.patch',
          ];
          return patches.join(' && ');
        }
      }
    },
    watch: {
      options: {
        interval: 1000
      },
      configFiles: {
        files: [ 'Gruntfile.js', 'package.json' ],
        options: {
          reload: true,
        }
      },
      css: {
        files: ['static/css/**/*'],
        tasks: ['mmcss', 'appcache', 'deploy']
      },
      js: {
        files: ['templates/**/*', 'static/js/**/*', 'packages/kujua-*/**/*', 'packages/libphonenumber/**/*', 'shared-libs/**'],
        tasks: ['mmjs', 'appcache', 'deploy']
      },
      other: {
        files: ['lib/**/*'],
        tasks: ['appcache', 'deploy']
      },
      compiledddocs: {
        files: ['ddocs/**/*'],
        tasks: ['couch-compile', 'deploy']
      },
      ddocs: {
        files: ['kanso.json'],
        tasks: ['deploy']
      },
      translations: {
        files: ['translations/*'],
        tasks: ['appcache', 'deploy']
      }
    },
    notify: {
      deployed: {
        options: {
          title: 'Medic Mobile',
          message: 'Deployed successfully'
        }
      }
    },
    karma: {
      unit: {
        configFile: './tests/karma/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless']
      },
      unit_ci: {
        configFile: './tests/karma/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless']
      },
      unit_continuous: {
        configFile: './tests/karma/karma-unit.conf.js',
        singleRun: false,
        browsers: ['Chrome_Headless']
      }
    },
    protractor: {
      tests_and_services: {
        options: {
          configFile: 'tests/protractor/tests-and-services.conf.js',
        }
      },
      tests_only: {
        options: {
          configFile: 'tests/protractor/tests-only.conf.js',
        }
      },
    },
    nodeunit: {
      all: [
        'tests/nodeunit/unit/**/*.js',
        '!tests/nodeunit/unit/*/utils.js',
        'api/tests/unit/**/*.js',
        '!api/tests/unit/utils.js',
        '!api/tests/unit/integration/**/*.js',
        'sentinel/test/unit/**/*.js',
        'sentinel/test/functional/**/*.js'
      ]
    },
    mochaTest: {
      unit: {
        src: [
          'tests/mocha/unit/**/*.spec.js',
          'api/tests/mocha/**/*.js',
          'sentinel/test/mocha/**/*.js'
        ],
      },
      api_integration: {
        src: [ 'api/tests/integration/**/*.js' ],
        options: {
          timeout: 10000
        }
      }
    },
    ngtemplates: {
      inboxApp: {
        src: [
          'templates/modals/**/*.html',
          'templates/partials/**/*.html',
          'templates/directives/**/*.html'
        ],
        dest: 'static/dist/templates.js',
        options: {
          htmlmin: {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
          }
        }
      }
    },
    appcache: {
      inbox: {
        dest: 'static/dist/manifest.appcache',
        baseUrl: '../../',
        network: '*',
        cache: {
          patterns: [
            'static/manifest.json',
            'static/audio/**/*',
            'static/dist/**/*',
            'static/fonts/**/*',
            'static/img/**/*',
            '!static/img/promo/**/*',
          ]
        }
      }
    },
    sass: {
      compile: {
        cwd: 'static/css',
        dest: 'build',
        expand: true,
        outputStyle: 'expanded',
        src: 'enketo/enketo.scss',
        ext: '.less',
        flatten: true,
        extDot: 'last'
      },
    },
    auto_install: {
      npm: {
        bower: false
      }
    },
    'regex-check': {
      only_in_tests: {
        files: [ { src: [
          'tests/**/*.js',
          'sentinel/test/mocha/**/*.js'
        ] } ],
        options: {
          // in Mocha, .only() is used
          // in Jasmine, fdescribe() and fit() are used
          pattern: /(\.only\()|(fdescribe\()|(fit\()/g,
        }
      },
      console_in_angular: {
        files: [ { src: [
          'static/js/**/*.js',

           // ignored because they don't have access to angular
          '!static/js/app.js',
          '!static/js/bootstrapper.js',

          // ignored because its job is to log to console
          '!static/js/modules/feedback.js'
        ] } ],
        options: {
          pattern: /console\./g
        }
      }
    },
    xmlmin: {
      enketoxslt: {
        files: {
          'static/dist/xslt/openrosa2html5form.xsl': 'static/dist/xslt/openrosa2html5form.xsl',
          'static/dist/xslt/openrosa2xmlmodel.xsl': 'static/dist/xslt/openrosa2xmlmodel.xsl'
        }
      }
    },
    'optimize-js': {
      'static/dist/inbox.js': 'static/dist/inbox.js',
      'static/dist/templates.js': 'static/dist/templates.js',
    },
  });

  // Build tasks
  grunt.registerTask('mmnpm', 'Update and patch npm dependencies', [
    'exec:undopatches',
    'auto_install:npm',
    'copy:librariestopatch',
    'exec:applypatches'
  ]);

  grunt.registerTask('mmjs', 'Build the JS resources', [
    'copy:libphonenumber',
    'copy:taskutils',
    'browserify:dist',
    'replace:hardcodeappsettings',
    'ngtemplates'
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'sass',
    'less',
    'postcss'
  ]);

  grunt.registerTask('enketoxslt', 'Process enketo XSL stylesheets', [
    'copy:enketoxslt',
    'xmlmin:enketoxslt'
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'mmcss',
    'mmjs',
    'couch-compile',
    'enketoxslt',
    'copy:inbox',
    'appcache'
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'exec:deploy',
    'notify:deployed'
  ]);

  // Test tasks
  grunt.registerTask('e2e', 'Deploy app for testing and run e2e tests', [
    'exec:deploytest',
    'protractor:tests_and_services',
  ]);

  grunt.registerTask('unit_continuous', 'Lint, karma unit tests running on a loop', [
    'jshint',
    'karma:unit_continuous'
  ]);

  grunt.registerTask('test_api_integration', 'Integration tests for medic-api', [
    'exec:check_env_vars',
    'exec:setup_api_integration',
    'mochaTest:api_integration'
  ]);

  grunt.registerTask('unit', 'Lint and unit tests', [
    'jshint',
    'karma:unit',
    'exec:sharedLibUnit',
    'env:test',
    'nodeunit',
    'mochaTest:unit',
    'env:dev',
  ]);

  grunt.registerTask('test', 'Lint, unit tests, api_integration tests and e2e tests', [
    'unit',
    'test_api_integration',
    'e2e'
  ]);

  // CI tasks
  grunt.registerTask('minify', 'Minify JS and CSS', [
    'uglify',
    'optimize-js',
    'cssmin',
    'exec:bundlesize'
  ]);

  grunt.registerTask('ci_before', '', [
    'precommit',
    'mmnpm',
    'build',
    'minify',
    'karma:unit_ci',
    'exec:sharedLibUnit',
    'env:test',
    'nodeunit',
    'mochaTest:unit',
    'env:dev',
  ]);

  grunt.registerTask('ci_after', '', [
    'exec:deploy',
    'test_api_integration',
    'e2e'
  ]);

  grunt.registerTask('ci1', 'Lint, build, minify, deploy and test for CI [CouchDB 1.x]', [
    'ci_before',
    'exec:setupAdmin1',
    'ci_after'
  ]);

  grunt.registerTask('ci2', 'Lint, build, minify, deploy and test for CI [CouchDB 2.x]', [
    'ci_before',
    'exec:setupAdmin2',
    'ci_after'
  ]);

  // Dev tasks
  grunt.registerTask('dev-webapp', 'Build and deploy the webapp for dev', [
    'mmnpm',
    'dev-webapp-no-npm'
  ]);

  grunt.registerTask('precommit', 'Static analysis checks', [
    'regex-check',
    'jshint',
    'exec:blankLinkCheck',
  ]);

  grunt.registerTask('dev-webapp-no-npm', 'Build and deploy the webapp for dev, without reinstalling dependencies.', [
    'build',
    'deploy',
    'watch'
  ]);

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'exec:apiDev'
  ]);

  grunt.registerTask('dev-sentinel', 'Run sentinel and watch for file changes', [
    'exec:sentinelDev'
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp'
  ]);
};
