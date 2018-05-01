const packageJson = require('./package.json'),
      releaseName = process.env.TRAVIS_TAG || process.env.TRAVIS_BRANCH || 'local-development';


module.exports = function(grunt) {

  'use strict';

  require('jit-grunt')(grunt, {
    'couch-compile': 'grunt-couch',
    'couch-push': 'grunt-couch',
    'ngtemplates': 'grunt-angular-templates',
    'protractor': 'grunt-protractor-runner',
    'replace': 'grunt-text-replace',
  });
  require('time-grunt')(grunt);

  // Project configuration
  grunt.initConfig({
    replace: {
      hardcodeappsettings: {
        src: [ 'webapp/dist/ddocs/medic/_attachments/js/inbox.js' ],
        overwrite: true,
        replacements: [{
          from: /@@APP_CONFIG.version/g,
          to: packageJson.version
        }, {
          from: /@@APP_CONFIG.name/g,
          to: packageJson.name
        }]
      },
      'change-ddoc-id-for-publish': {
        src: [ 'webapp/dist/ddocs/medic.json' ],
        overwrite: true,
        replacements: [{
          from: '"_id": "_design/medic"',
          to: `"_id": "medic:medic:${releaseName}"`
        }]
      },
    },
    'couch-compile': {
      client: {
        files: {
          'webapp/dist/ddocs/medic/_attachments/ddocs/compiled.json': 'webapp/dist/ddocs/medic-*/'
        }
      },
      app: {
        files: {
          'webapp/dist/ddocs/medic.json': 'webapp/dist/ddocs/medic/'
        }
      },
    },
    'couch-push': {
      localhost: {
        options: {
          user: 'admin',
          pass: 'pass'
        },
        files: {
          'http://localhost:5984/medic': 'webapp/dist/ddocs/medic.json'
        }
      },
      test: {
        options: {
          user: 'admin',
          pass: 'pass'
        },
        files: {
          'http://localhost:5984/medic-test': 'webapp/dist/ddocs/medic.json'
        }
      },
      staging: {
        files: [
          {
            src: 'webapp/dist/ddocs/medic.json',
            dest: process.env.UPLOAD_URL + '/_couch/builds'
          },
        ],
      },
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true
        }
      },
      dist: {
        src: 'webapp/src/js/app.js',
        dest: 'webapp/dist/ddocs/medic/_attachments/js/inbox.js',
        browserifyOptions: {
          detectGlobals: false
        },
        options: {
          transform: ['browserify-ngannotate'],
          alias: {
            'enketo-config': './webapp/src/js/enketo/config.json',
            'widgets': './webapp/src/js/enketo/widgets',
            './xpath-evaluator-binding':'./webapp/src/js/enketo/OpenrosaXpathEvaluatorBinding',
            'extended-xpath': './webapp/node_modules/openrosa-xpath-evaluator/src/extended-xpath',
            'openrosa-xpath-extensions': './webapp/node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
            'translator': './webapp/src/js/enketo/translator', // translator for enketo's internal i18n
            '../../js/dropdown.jquery': './webapp/node_modules/bootstrap/js/dropdown', // enketo currently duplicates bootstrap's dropdown code.  working to resolve this upstream https://github.com/enketo/enketo-core/issues/454
            'angular-translate-interpolation-messageformat': './webapp/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
            'angular-translate-handler-log':  './webapp/node_modules/angular-translate/dist/angular-translate-handler-log/angular-translate-handler-log',
          },
        }
      },
      admin: {
        src: 'admin/src/js/main.js',
        dest: 'webapp/dist/ddocs/medic-admin/_attachments/main.js',
        options: {
          transform: ['browserify-ngannotate'],
          alias: {
            'angular-translate-interpolation-messageformat': './admin/node_modules/angular-translate/dist/angular-translate-interpolation-messageformat/angular-translate-interpolation-messageformat',
          },
        },
      },
    },
    uglify: {
      options: {
        banner: '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          'webapp/dist/ddocs/medic/_attachments/js/templates.js': 'webapp/dist/ddocs/medic/_attachments/js/templates.js',
          'webapp/dist/ddocs/medic/_attachments/js/inbox.js': 'webapp/dist/ddocs/medic/_attachments/js/inbox.js',
        }
      }
    },
    env: {
      unitTest: {
        options: {
          add: {
            UNIT_TEST_ENV: '1'
          }
        }
      },
      general: {
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
          'webapp/src/js/modules/xpath-element-path.js',
          'webapp/tests/karma/q.js',
          '**/node_modules/**',
          'sentinel/src/lib/pupil/**',
          'webapp/dist/**'
        ]
      },
      all: [
        'Gruntfile.js',
        'webapp/src/**/*.js',
        'webapp/tests/**/*.js',
        'tests/**/*.js',
        'api/**/*.js',
        'sentinel/**/*.js',
        'shared-libs/**/*.js',
        'admin/**/*.js',
      ]
    },
    less: {
      webapp: {
        files: {
          'webapp/dist/ddocs/medic/_attachments/css/inbox.css': 'webapp/src/css/inbox.less'
        }
      },
      admin: {
        files: {
          'webapp/dist/ddocs/medic-admin/_attachments/main.css': 'admin/src/css/main.less'
        }
      },
    },
    cssmin: {
      all: {
        options: {
          keepSpecialComments: 0
        },
        files: {
          'webapp/dist/ddocs/medic/_attachments/css/inbox.css': 'webapp/dist/ddocs/medic/_attachments/css/inbox.css'
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
        src: 'webapp/dist/ddocs/medic/_attachments/css/*.css'
      }
    },
    copy: {
      ddocs: {
        files: [
          {
            expand: true,
            cwd: 'webapp/src/ddocs/',
            src: '**/*',
            dest: 'webapp/dist/ddocs/'
          },
        ]
      },
      inbox: {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'webapp/node_modules/font-awesome/fonts/*',
            dest: 'webapp/dist/ddocs/medic/_attachments/fonts/'
          }
        ]
      },
      ddocAttachments: {
        files: [
          {
            expand: true,
            cwd: 'webapp/src/',
            src: [
              'audio/**/*',
              'fonts/**/*',
              'img/**/*',
              'templates/inbox.html'
            ],
            dest: 'webapp/dist/ddocs/medic/_attachments/'
          }
        ]
      },
      'admin-resources': {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'admin/src/css/main.css',
            dest: 'webapp/dist/ddocs/medic-admin/_attachments/'
          },
          {
            expand: true,
            flatten: true,
            src: 'admin/src/templates/index.html',
            dest: 'webapp/dist/ddocs/medic-admin/_attachments/'
          },
          {
            expand: true,
            flatten: true,
            src: 'admin/node_modules/font-awesome/fonts/*',
            dest: 'webapp/dist/ddocs/medic-admin/_attachments/fonts/'
          }
        ]
      },
      librariestopatch: {
        files: [
          {
            expand: true,
            cwd: 'webapp/node_modules',
            src: [
              'bootstrap-daterangepicker/**',
              'font-awesome/**',
              'moment/**',
              'pouchdb-browser/**',
            ],
            dest: 'webapp/node_modules_backup'
          }
        ]
      },
      enketoxslt: {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'webapp/node_modules/medic-enketo-xslt/xsl/*.xsl',
            dest: 'webapp/dist/ddocs/medic/_attachments/xslt/'
          }
        ]
      }
    },
    exec: {
      'clean-dist': {
        cmd: 'rm -rf webapp/dist && mkdir webapp/dist'
      },
      packNodeModules: {
        cmd: ['api', 'sentinel'].map(module => [
              `cd ${module}`,
              `rm -rf node_modules`,
              `yarn install --production`,
              `npm pack`, // Use npm until yarn pack is fixed: https://github.com/medic/medic-webapp/issues/4489
              `mv medic-*.tgz ../webapp/dist/ddocs/medic/_attachments/`,
              `cd ..`,
            ].join(' && ')).join(' && ')
      },
      'bundle-dependencies': {
        cmd: () => {
          ['api', 'sentinel'].forEach(module => {
            const filePath = `${module}/package.json`;
            const pkg = this.file.readJSON(filePath);
            pkg.bundledDependencies = Object.keys(pkg.dependencies);
            this.file.write(filePath, JSON.stringify(pkg, undefined, '  '));
            console.log(`Updated 'bundledDependencies' for ${filePath}`);
          });
          return 'echo "Node module dependencies updated"';
        }
      },
      ddocAppSettings: {
        cmd: 'node ./scripts/merge-app-settings $COUCH_URL/_design/medic webapp/dist/ddocs/medic.json'
      },
      setDdocVersion: {
        cmd: () => {
          let version;
          if (process.env.TRAVIS_TAG) {
            version = process.env.TRAVIS_TAG;
          } else {
            version = require('./package.json').version;
            if (process.env.TRAVIS_BRANCH === 'master') {
              version += `-alpha.${process.env.TRAVIS_BUILD_NUMBER}`;
            }
          }
          return `echo "${version}" > webapp/dist/ddocs/medic/version`;
        }
      },
      setHorticulturalistMetadata: {
        cmd: () => `
          mkdir -p webapp/dist/ddocs/medic/build_info;
          cd webapp/dist/ddocs/medic/build_info;
          echo "${releaseName}" > version;
          echo "${new Date().toISOString()}" > time;
          echo "grunt on \`whoami\`" > author;`
      },
      apiDev: {
        cmd: 'TZ=UTC ./node_modules/.bin/nodemon --watch api api/server.js -- --allow-cors'
      },
      sentinelDev: {
        cmd: 'TZ=UTC ./node_modules/.bin/nodemon --watch sentinel sentinel/server.js'
      },
      blankLinkCheck: {
        cmd: `echo "Checking for dangerous _blank links..." &&
               ! (git grep -E  'target\\\\?="_blank"' -- webapp/src |
                      grep -Ev 'target\\\\?="_blank" rel\\\\?="noopener noreferrer"' |
                      grep -Ev '^\s*//' &&
                  echo 'ERROR: Links found with target="_blank" but no rel="noopener noreferrer" set.  Please add required rel attribute.')`,
      },
      setupAdmin: {
        cmd: 'curl -X PUT http://localhost:5984/_node/${COUCH_NODE_NAME}/_config/admins/admin -d \'"pass"\'' +
             ' && curl -X POST http://admin:pass@localhost:5984/_users ' +
                 ' -H "Content-Type: application/json" ' +
                 ' -d \'{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}\' ' +
             ' && curl -X PUT --data \'"true"\' http://admin:pass@localhost:5984/_node/${COUCH_NODE_NAME}/_config/chttpd/require_valid_user' +
             ' && curl -X PUT --data \'"4294967296"\' http://admin:pass@localhost:5984/_node/${COUCH_NODE_NAME}/_config/httpd/max_http_request_size'
      },
      resetTestDatabases: {
        stderr: false,
        cmd: ['medic-test', 'medic-audit-test']
                .map(name => `curl -X DELETE http://admin:pass@localhost:5984/${name}`)
                .join(' && ')
      },
      bundlesize: {
        cmd: 'node ./node_modules/bundlesize/index.js'
      },
      setup_api_integration: {
        cmd: 'cd api && yarn install',
      },
      yarn_install: {
        cmd: ['webapp', 'api', 'sentinel', 'admin']
              .map(dir => `echo "[${dir}]" && cd ${dir} && yarn install && cd ..`)
              .join(' && ')
      },
      start_webdriver: {
        cmd: 'yarn webdriver-manager update && ' +
             'yarn webdriver-manager start > tests/logs/webdriver.log & ' +
             'until nc -z localhost 4444; do sleep 1; done'
      },
      check_env_vars:
        'if [ -z $COUCH_URL ] || [ -z $API_URL ] || [ -z $COUCH_NODE_NAME ]; then ' +
            'echo "Missing required env var.  Check that all are set: ' +
            'COUCH_URL, API_URL, COUCH_NODE_NAME" && exit 1; fi',
      undopatches: {
        cmd: function() {
          var modulesToPatch = [
            'bootstrap-daterangepicker',
            'font-awesome',
            'moment',
            'pouchdb-browser',
          ];
          return modulesToPatch.map(function(module) {
            var backupPath = 'webapp/node_modules_backup/' + module;
            var modulePath = 'webapp/node_modules/' + module;
            return '[ -d ' + backupPath + ' ]' +
                   ' && rm -rf ' + modulePath +
                   ' && mv ' + backupPath + ' ' + modulePath +
                   ' && echo "Module restored: ' + module + '"' +
                   ' || echo "No restore required for: ' + module + '"';
          }).join(' && ');
        }
      },
      sharedLibUnit: {
        cmd: () => {
          const fs = require('fs');
          return fs.readdirSync('shared-libs')
              .filter(f => fs.lstatSync(`shared-libs/${f}`).isDirectory())
              .map(lib =>
                  `echo Testing shared library: ${lib} &&
                  (cd shared-libs/${lib} &&
                  [ "$(jq .scripts.test)" = "null" ] || (yarn install && yarn test))`)
              .join(' && ');
        },
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
            'patch webapp/node_modules/bootstrap-daterangepicker/daterangepicker.js < patches/bootstrap-daterangepicker.patch',

            // patch font-awesome to remove version attributes so appcache works
            // https://github.com/FortAwesome/Font-Awesome/issues/3286
            'patch webapp/node_modules/font-awesome/less/path.less < patches/font-awesome-remove-version-attribute.patch',

            // patch moment.js to use western arabic (european) numerals in Hindi
            'patch webapp/node_modules/moment/locale/hi.js < patches/moment-hindi-use-euro-numerals.patch',

            // patch pouch to:
            // * ignore doc_ids when generating replication id (https://github.com/medic/medic-webapp/issues/2404)
            // * improve safari checks (https://github.com/medic/medic-webapp/issues/2797)
            'patch webapp/node_modules/pouchdb-browser/lib/index.js < patches/pouchdb-browser.patch',
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
        files: ['Gruntfile.js', 'package.json'],
        options: {
          reload: true,
        }
      },
      css: {
        files: ['webapp/src/css/**/*'],
        tasks: ['mmcss', 'build-common', 'deploy']
      },
      js: {
        files: ['webapp/src/**/*', 'webapp/src/js/**/*', 'shared-libs/**'],
        tasks: ['mmjs', 'build-common', 'deploy']
      },
      compiledddocs: {
        files: ['webapp/src/ddocs/**/*'],
        tasks: ['build-ddoc', 'deploy']
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
        configFile: './webapp/tests/karma/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless']
      },
      unit_continuous: {
        configFile: './webapp/tests/karma/karma-unit.conf.js',
        singleRun: false,
        browsers: ['Chrome_Headless']
      },
      admin: {
        configFile: './admin/tests/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome_Headless']
      },
    },
    protractor: {
      e2e_tests_and_services: {
        options: {
          configFile: 'tests/e2e.tests-and-services.conf.js',
        }
      },
      e2e_tests_only: {
        options: {
          configFile: 'tests/e2e.tests-only.conf.js',
        }
      },
      performance_tests_and_services: {
        options: {
          configFile: 'tests/performance.tests-and-services.conf.js',
        }
      },
      performance_tests_only: {
        options: {
          configFile: 'tests/performance.tests-only.conf.js',
        }
      },
    },
    nodeunit: {
      webapp: [
        'webapp/tests/nodeunit/unit/**/*.js',
        '!webapp/tests/nodeunit/unit/*/utils.js',
      ],
      api: [
        'api/tests/unit/**/*.js',
        '!api/tests/unit/utils.js',
        '!api/tests/unit/integration/**/*.js',
      ]
    },
    mochaTest: {
      unit: {
        src: [
          'webapp/tests/mocha/unit/**/*.spec.js',
          'api/tests/mocha/**/*.js',
          'sentinel/tests/**/*.js'
        ],
      },
      integration: {
        src: 'tests/integration/**/*.js',
        options: {
          require: 'tests/integration-setup.js'
        }
      },
      api_integration: {
        src: 'api/tests/integration/**/*.js',
        options: {
          timeout: 10000
        }
      }
    },
    ngtemplates: {
      inboxApp: {
        cwd: 'webapp/src',
        src: [
          'templates/modals/**/*.html',
          'templates/partials/**/*.html',
          'templates/directives/**/*.html'
        ],
        dest: 'webapp/dist/ddocs/medic/_attachments/js/templates.js',
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
      },
      adminApp: {
        cwd: 'admin/src',
        src: [
          'templates/**/*.html',
          '!templates/index.html',
        ],
        dest: 'webapp/dist/ddocs/medic-admin/_attachments/templates.js',
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
      options: {
        basePath: 'webapp/dist/ddocs/medic/_attachments',
      },
      inbox: {
        dest: 'webapp/dist/ddocs/medic/_attachments/manifest.appcache',
        network: '*',
        cache: {
          patterns: [
            'webapp/dist/ddocs/medic/_attachments/manifest.json',
            'webapp/dist/ddocs/medic/_attachments/audio/**/*',
            'webapp/dist/ddocs/medic/_attachments/css/**/*',
            'webapp/dist/ddocs/medic/_attachments/fonts/**/*',
            'webapp/dist/ddocs/medic/_attachments/img/**/*',
            'webapp/dist/ddocs/medic/_attachments/js/**/*',
            'webapp/dist/ddocs/medic/_attachments/xslt/**/*',
          ]
        }
      }
    },
    sass: {
      compile: {
        cwd: 'webapp/src/css/',
        src: 'enketo/enketo.scss',
        dest: 'webapp/dist',
        ext: '.less',
        expand: true,
        outputStyle: 'expanded',
        flatten: true,
        extDot: 'last'
      },
    },
    'regex-check': {
      only_in_tests: {
        files: [ { src: [
          'api/tests/**/*.js',
          'webapp/tests/**/*.js',
          'sentinel/tests/**/*.js'
        ] } ],
        options: {
          // in Mocha, .only() is used
          // in Jasmine, fdescribe() and fit() are used
          pattern: /(\.only\()|(fdescribe\()|(fit\()/g,
        }
      },
      console_in_angular: {
        files: [ { src: [
          'webapp/src/js/**/*.js',

           // ignored because they don't have access to angular
          '!webapp/src/js/app.js',
          '!webapp/src/js/bootstrapper.js',

          // ignored because its job is to log to console
          '!webapp/src/js/modules/feedback.js'
        ] } ],
        options: {
          pattern: /console\./g
        }
      }
    },
    xmlmin: {
      enketoxslt: {
        files: {
          'webapp/dist/ddocs/medic/_attachments/xslt/openrosa2html5form.xsl': 'webapp/dist/ddocs/medic/_attachments/xslt/openrosa2html5form.xsl',
          'webapp/dist/ddocs/medic/_attachments/xslt/openrosa2xmlmodel.xsl': 'webapp/dist/ddocs/medic/_attachments/xslt/openrosa2xmlmodel.xsl'
        }
      }
    },
    'optimize-js': {
      'webapp/dist/ddocs/medic/_attachments/js/inbox.js': 'webapp/dist/ddocs/medic/_attachments/js/inbox.js',
      'webapp/dist/ddocs/medic/_attachments/js/templates.js': 'webapp/dist/ddocs/medic/_attachments/js/templates.js',
    },
  });

  // Build tasks
  grunt.registerTask('install_dependencies', 'Update and patch dependencies', [
    'exec:undopatches',
    'exec:yarn_install',
    'copy:librariestopatch',
    'exec:applypatches'
  ]);

  grunt.registerTask('mmjs', 'Build the JS resources', [
    'browserify:dist',
    'replace:hardcodeappsettings',
    'ngtemplates:inboxApp'
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'sass',
    'less:webapp',
    'postcss'
  ]);

  grunt.registerTask('enketoxslt', 'Process enketo XSL stylesheets', [
    'copy:enketoxslt',
    'xmlmin:enketoxslt'
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'exec:clean-dist',
    'copy:ddocs',
    'build-node-modules',
    'mmcss',
    'mmjs',
    'enketoxslt',
    'minify',
    'build-common',
  ]);

  grunt.registerTask('build-dev', 'Build the static resources', [
    'exec:clean-dist',
    'copy:ddocs',
    'mmcss',
    'mmjs',
    'enketoxslt',
    'build-common',
  ]);

  grunt.registerTask('build-common', 'Build the static resources', [
    'copy:inbox',
    'exec:setDdocVersion',
    'exec:setHorticulturalistMetadata',
    'build-admin',
    'build-ddoc',
  ]);

  grunt.registerTask('build-ddoc', 'Build the main ddoc', [
    'couch-compile:client',
    'copy:ddocAttachments',
    'appcache',
    'couch-compile:app',
  ]);

  grunt.registerTask('build-admin', 'Build the admin app', [
    'copy:admin-resources',
    'ngtemplates:adminApp',
    'browserify:admin',
    'less:admin',
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'exec:ddocAppSettings',
    'couch-push:localhost',
    'notify:deployed',
  ]);

  grunt.registerTask('build-node-modules', 'Build and pack api and sentinel bundles', [
    'exec:bundle-dependencies',
    'exec:packNodeModules',
  ]);

  // Test tasks
  grunt.registerTask('e2e', 'Deploy app for testing and run e2e tests', [
    'exec:resetTestDatabases',
    'build-admin',
    'build-node-modules',
    'build-ddoc',
    'couch-push:test',
    'protractor:e2e_tests_and_services'
  ]);

  grunt.registerTask('test_perf', 'Run performance-specific tests', [
    'exec:resetTestDatabases',
    'build-node-modules',
    'build-ddoc',
    'couch-push:test',
    'protractor:performance_tests_and_services'
  ]);

  grunt.registerTask('unit_continuous', 'Lint, karma unit tests running on a loop', [
    'jshint',
    'karma:unit_continuous'
  ]);

  grunt.registerTask('integration', 'Run all integration tests', [
    'mochaTest:integration',
    'test_api_integration'
  ]);

  grunt.registerTask('test_api_integration', 'Integration tests for medic-api', [
    'exec:check_env_vars',
    'exec:setup_api_integration',
    'mochaTest:api_integration'
  ]);

  grunt.registerTask('unit', 'Lint and unit tests', [
    'jshint',
    'karma:unit',
    'karma:admin',
    'exec:sharedLibUnit',
    'env:unitTest',
    'nodeunit',
    'mochaTest:unit',
    'env:general',
  ]);

  grunt.registerTask('test', 'Lint, unit tests, integration tests and e2e tests', [
    'unit',
    'integration',
    'e2e'
  ]);

  // CI tasks
  grunt.registerTask('minify', 'Minify JS and CSS', [
    'uglify',
    'optimize-js',
    'cssmin',
    'exec:bundlesize'
  ]);

  grunt.registerTask('ci-build', 'build and minify for CI', [
    'install_dependencies',
    'build',
    'build-admin'
  ]);

  grunt.registerTask('ci-unit', 'Lint, deploy and test for CI', [
    'precommit',
    'install_dependencies',
    'karma:unit',
    'karma:admin',
    'exec:sharedLibUnit',
    'env:unitTest',
    'nodeunit',
    'mochaTest:unit',
  ]);

  grunt.registerTask('ci-integration-e2e', 'Run further tests for CI', [
    'env:general',
    'exec:setupAdmin',
    'deploy',
    'integration',
    'exec:start_webdriver',
    'e2e'
  ]);

  grunt.registerTask('ci-performance', 'Run performance tests on CI', [
    'env:general',
    'exec:setupAdmin',
    'deploy',
    'test_perf',
  ]);

  // Dev tasks
  grunt.registerTask('dev-webapp', 'Build and deploy the webapp for dev', [
    'install_dependencies',
    'dev-webapp-no-dependencies'
  ]);

  grunt.registerTask('precommit', 'Static analysis checks', [
    'regex-check',
    'exec:blankLinkCheck',
    'jshint',
  ]);

  grunt.registerTask('dev-webapp-no-dependencies', 'Build and deploy the webapp for dev, without reinstalling dependencies.', [
    'build-dev',
    'deploy',
    'watch'
  ]);

  grunt.registerTask('dev-api', 'Run api and watch for file changes', [
    'exec:apiDev'
  ]);

  grunt.registerTask('dev-sentinel', 'Run sentinel and watch for file changes', [
    'exec:sentinelDev'
  ]);

  grunt.registerTask('publish', 'Publish the ddoc to the staging server', [
    'replace:change-ddoc-id-for-publish',
    'couch-push:staging',
  ]);

  grunt.registerTask('default', 'Build and deploy the webapp for dev', [
    'dev-webapp'
  ]);
};
