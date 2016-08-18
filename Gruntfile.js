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
            'pouchdb-generate-replication-id-original': './node_modules/pouchdb-generate-replication-id'
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
              'font-awesome/**'
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
            src: [ 'node_modules/google-libphonenumber/dist/browser/libphonenumber.js' ],
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
        cmd: 'curl -X PUT http://localhost:5984/_config/admins/admin -d \'"pass"\'' +
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
      undopatches: {
        cmd: function() {
          var modulesToPatch = [
            'bootstrap-daterangepicker',
            'font-awesome'
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
          ];
          return patches.join(' && ');
        }
      }
    },
    watch: {
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
        tasks: ['deploy']
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
    },
    nodeunit: {
      all: ['tests/nodeunit/unit/**/*.js']
    },
    ngtemplates: {
      inboxApp: {
        src: [ 'templates/modals/**/*.html', 'templates/partials/**/*.html' ],
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

  // Default tasks

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

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'exec:deploy',
    'notify:deployed'
  ]);

  grunt.registerTask('default', 'Build the static resources', [
    'mmnpm',
    'mmcss',
    'mmjs',
    'couch-compile',
    'copy:enketoxslt',
    'copy:inbox',
    'appcache'
  ]);

  grunt.registerTask('minify', 'Minify JS and CSS', [
    'uglify',
    'cssmin'
  ]);

  grunt.registerTask('ci', 'Build, minify, and test for CI', [
    'jshint',
    'default',
    'minify',
    'karma:unit_ci',
    'nodeunit',
    'exec:setupAdmin',
    'exec:deploy',
    'test_api_integration',
    'e2e'
  ]);

  grunt.registerTask('dev', 'Build and deploy for dev', [
    'default',
    'deploy',
    'watch'
  ]);

  grunt.registerTask('e2e', 'Deploy app and run e2e tests', [
    'exec:deploytest',
    'protractor'
  ]);

  grunt.registerTask('test', 'Lint, unit, and api_integration test', [
    'jshint',
    'karma:unit',
    'nodeunit',
    'test_api_integration',
    'e2e'
  ]);

  grunt.registerTask('test_continuous', 'Lint, unit test running on a loop', [
    'jshint',
    'karma:unit_continuous'
  ]);

  grunt.registerTask('test_api_integration', [
    'exec:test_api_integration_setup',
    'exec:test_api_integration',
  ]);

};
