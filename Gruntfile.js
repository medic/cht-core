var kansoJson = require('./kanso.json');

module.exports = function(grunt) {

  'use strict';

  require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

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
            'kujua-utils': './packages/kujua-utils/kujua-utils',
            'cookies': './packages/cookies/cookies',
            'session': './packages/session/session',
            'kujua-sms/utils': './packages/kujua-sms/kujua-sms/utils',
            'views/lib/objectpath': './packages/kujua-sms/views/lib/objectpath',
            'views/lib/app_settings': './packages/kujua-sms/views/lib/app_settings',
            'text!enketo-config': './static/js/enketo/config.json',
            'widgets': './static/js/enketo/widgets',
            './xpath-evaluator-binding':'./static/js/enketo/OpenrosaXpathEvaluatorBinding',
            'extended-xpath': './node_modules/openrosa-xpath-evaluator/src/extended-xpath',
            'openrosa-xpath-extensions': './node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions',
            'libphonenumber/utils': './packages/libphonenumber/libphonenumber/utils',
            'libphonenumber/libphonenumber': './packages/libphonenumber/libphonenumber/libphonenumber',
            'worker-pouch/workerified': './node_modules/worker-pouch/lib/workerified/',
            'pouchdb-generate-replication-id': './static/js/modules/pouchdb-generate-replication-id-patched',
            'pouchdb-generate-replication-id-original': './node_modules/pouchdb-generate-replication-id',
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
    jshint: {
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish'),
        ignores: [
          'tests/karma/q.js'
        ]
      },
      all: [
        'Gruntfile.js',
        'static/js/**/*.js',
        'tests/**/*.js',
        'ddocs/**/*.js',
        'lib/**/*.js'
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
              'font-awesome/**',
              'pouchdb-adapter-idb/**',
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
            src: [ 'node_modules/enketo-client-side-transformer/xslt/client-side/*.xsl' ],
            dest: 'static/dist/xslt/'
          }
        ]
      }
    },
    exec: {
      deploy: {
        cmd: 'kanso push $COUCH_URL'
      },
      setupAdmin: {
        cmd: 'curl -X PUT http://localhost:5984/_node/${COUCH_NODE_NAME}/_config/admins/admin -d \'"pass"\'' +
             ' && curl -X POST http://admin:pass@localhost:5984/_users ' +
             ' -H "Content-Type: application/json" ' +
             ' -d \'{"_id": "org.couchdb.user:admin", "name": "admin", "password":"pass", "type":"user", "roles":[]}\''
      },
      deploytest: {
        stderr: false,
        cmd: 'curl -X DELETE http://admin:pass@localhost:5984/medic-test' +
             ' && curl -X DELETE http://admin:pass@localhost:5984/medic-audit-test' +
             ' && kanso push http://admin:pass@localhost:5984/medic-test'
      },
      test_api_integration_setup: {
        cmd: 'cd api && npm install',
      },
      test_api_integration: {
        cmd: 'cd api && grunt test_integration',
      },
      test_api_e2e: {
        cmd: 'cd api && node server.js & sleep 20 && cd api && ./scripts/e2e/create_fixtures && grunt test_e2e',
      },
      undopatches: {
        cmd: function() {
          var modulesToPatch = [
            'bootstrap-daterangepicker',
            'font-awesome',
            'pouchdb-adapter-idb',
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

            // patch pouch to improve safari checks
            // https://github.com/medic/medic-webapp/issues/2797
            'patch node_modules/pouchdb-adapter-idb/src/index.js < patches/pouchdb-ignore-safari-check.patch',
          ];
          return patches.join(' && ');
        }
      }
    },
    watch: {
      configFiles: {
        files: [ 'Gruntfile.js', 'package.json' ],
        options: {
          reload: true
        }
      },
      css: {
        files: ['static/css/**/*'],
        tasks: ['mmcss', 'appcache', 'deploy']
      },
      js: {
        files: ['templates/**/*', 'static/js/**/*', 'packages/kujua-*/**/*', 'packages/libphonenumber/**/*'],
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
    notify_hooks: {
      options: {
        enabled: true,
        max_jshint_notifications: 1,
        title: 'Medic Mobile'
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
        browsers: ['Chrome']
      },
      unit_ci: {
        configFile: './tests/karma/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Firefox']
      },
      unit_continuous: {
        configFile: './tests/karma/karma-unit.conf.js',
        singleRun: false,
        browsers: ['Chrome']
      }
    },
    protractor: {
      default: {
        options: {
          configFile: 'tests/protractor/conf.js'
        }
      },
      chrome: {
        options: {
          configFile: 'tests/protractor/conf-chrome.js'
        }
      },
    },
    nodeunit: {
      all: ['tests/nodeunit/unit/**/*.js']
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
      options: {
        importer: function(url, prev, done) {
          // fixes relative enketo-core submodule references in npm 3.x.x
          if (/\/node_modules\//.test(url) && /\/node_modules\/enketo-core\//.test(prev)) {
            url = '../../' + url;
          }
          done({ file: url });
        }
      },
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
    }
  });

  grunt.task.run('notify_hooks');

  // Build tasks
  grunt.registerTask('mmnpm', 'Update and patch npm dependencies', [
    'exec:undopatches',
    'auto_install:npm',
    'copy:librariestopatch',
    'exec:applypatches'
  ]);

  grunt.registerTask('mmjs', 'Build the JS resources', [
    'copy:libphonenumber',
    'browserify:dist',
    'replace:hardcodeappsettings',
    'ngtemplates'
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'sass',
    'less',
    'postcss'
  ]);

  grunt.registerTask('build', 'Build the static resources', [
    'mmcss',
    'mmjs',
    'couch-compile',
    'copy:enketoxslt',
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
    'protractor:default'
  ]);

  grunt.registerTask('e2e-chrome', 'Deploy app for testing and run e2e tests on chrome', [
    'exec:deploytest',
    'protractor:chrome'
  ]);

  grunt.registerTask('api_e2e', 'Deploy app for testing and run e2e tests', [
    'exec:deploytest',
    'exec:test_api_e2e',
  ]);

  grunt.registerTask('unit_continuous', 'Lint, karma unit tests running on a loop', [
    'jshint',
    'karma:unit_continuous'
  ]);

  grunt.registerTask('test_api_integration', 'Integration tests for medic-api', [
    'exec:test_api_integration_setup',
    'exec:test_api_integration',
  ]);

  grunt.registerTask('test', 'Lint, unit tests, api_integration tests and e2e tests', [
    'jshint',
    'karma:unit',
    'nodeunit',
    'test_api_integration',
    'e2e'
  ]);

  // CI tasks
  grunt.registerTask('minify', 'Minify JS and CSS', [
    'uglify',
    'cssmin'
  ]);

  grunt.registerTask('ci', 'Lint, build, minify, deploy and test for CI', [
    'jshint',
    'mmnpm',
    'build',
    'minify',
    'karma:unit_ci',
    'nodeunit',
    'exec:setupAdmin',
    'exec:deploy',
    'test_api_integration',
    'e2e',
    'api_e2e',
  ]);

  // Dev tasks
  grunt.registerTask('dev', 'Build and deploy for dev', [
    'mmnpm',
    'dev-no-npm'
  ]);

  grunt.registerTask('dev-no-npm', 'Build and deploy for dev, without reinstalling dependencies.', [
    'build',
    'deploy',
    'watch'
  ]);

  grunt.registerTask('default', 'Build and deploy for dev', [
    'dev'
  ]);
};
