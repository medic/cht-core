var kansoJson = require('./kanso.json'),
    path = require('path');

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
      },
      monkeypatchdate: {
        src: [ 'static/dist/inbox.js' ],
        overwrite: true,
        replacements: [{
          from: /clickDate: function \(e\) \{/g,
          to: 'clickDate: function (e) {\n\n// MONKEY PATCH BY GRUNT: Needed for the mobile version.\nthis.element.trigger(\'mm.dateSelected.daterangepicker\', this);\n'
        }]
      },
      monkeypatchpouch: {
        src: [ 'static/dist/inbox.js' ],
        overwrite: true,
        replacements: [{
          from: /      if \(continuous\) \{\n        changesOpts\.live = true;\n        getChanges\(\);\n      \} else \{\n        changesCompleted = true;\n      \}/g,
          to: '// START MONKEY PATCH FOR https://github.com/pouchdb/pouchdb/issues/5145\n      var complete = function () {\n        if (continuous) {\n          changesOpts.live = true;\n          getChanges();\n        } else {\n          changesCompleted = true;\n        }\n        processPendingBatch(true);\n      };\n      if (!currentBatch && changes.last_seq > last_seq) {\n        writingCheckpoint = true;\n        checkpointer.writeCheckpoint(changes.last_seq, session).then(function () {\n          writingCheckpoint = false;\n          result.last_seq = last_seq = changes.last_seq;\n          complete();\n        })\n        .catch(onCheckpointError);\n      } else {\n        changesCompleted = true;\n        complete();\n      }\n      return;\n// END MONKEY PATCH'
        }]
      },
      // replace cache busting which breaks appcache, needed until this is fixed:
      // https://github.com/FortAwesome/Font-Awesome/issues/3286
      monkeypatchfontawesome: {
        src: [ 'static/dist/inbox.css' ],
        overwrite: true,
        replacements: [{
          from: /(\/fonts\/fontawesome-webfont[^?]*)[^']*/gi,
          to: '$1'
        }]
      }
    },
    browserify: {
      dist: {
        src: ['static/js/app.js'],
        dest: 'static/dist/inbox.js',
        browserifyOptions: {
          detectGlobals: false
        },
        options: {
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
            'libphonenumber/libphonenumber': './packages/libphonenumber/libphonenumber/libphonenumber'
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
        'tests/**/*.js'
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
          require('autoprefixer-core')({ browsers: 'last 2 versions' })
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
            src: [
              'node_modules/font-awesome/fonts/*'
            ],
            dest: 'static/fonts'
          },
        ]
      },
      libphonenumber: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [
              'node_modules/google-libphonenumber/dist/browser/libphonenumber.js'
            ],
            dest: 'packages/libphonenumber/libphonenumber/'
          },
        ]
      },
      'enketo-xslt': {
        files: [
          {
            expand: true,
            flatten: true,
            src: [ 'node_modules/enketo-client-side-transformer/xslt/client-side/*.xsl' ],
            dest: 'static/dist/xslt/'
          }
        ]
      },
      // npm v3 puts nested node_modules at the top level. copy the css resources
      // so sass compilation still works.
      'enketo-css': {
        files: [
          {
            src: [
              'node_modules/bootstrap-datepicker/dist/css/bootstrap-datepicker.css',
              'node_modules/bootstrap-timepicker/css/bootstrap-timepicker.css',
              'node_modules/bootstrap-slider-basic/sass/_bootstrap-slider.scss'
            ],
            dest: 'node_modules/enketo-core/',
            filter: function (filepath) {
              // return false if the file exists
              return !grunt.file.exists(path.join('node_modules/enketo-core/', filepath));
            },
          }
        ]
      }
    },
    exec: {
      compileddoc: {
        cmd: function(ddocName) {
          return 'kanso show "ddocs/'+ddocName+'"> ddocs/compiled/'+ddocName+'.json';
        }
      },
      deploy: {
        cmd: 'kanso push'
      },
      deployci: {
        cmd: 'kanso push http://localhost:5984/medic'
      },
      runapi: {
        cmd: 'COUCH_URL=http://ci_test:pass@localhost:5984/medic node ./api/server.js > api.out &'
      },
      sleep: {
        cmd: 'sleep 20'
      },
      addadmin: {
        cmd: function() {
          return 'curl -X PUT http://localhost:5984/_config/admins/ci_test -d \'"pass"\' &&' +
                 'curl -HContent-Type:application/json -vXPUT http://ci_test:pass@localhost:5984/_users/org.couchdb.user:ci_test  --data-binary \'{"_id": "org.couchdb.user:ci_test", "name": "ci_test", "roles": [], "type": "user", "password": "pass", "language": "en", "known": true}\'';
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
      options: {
        baseUrl: '../../'
      },
      inbox: {
        dest: 'static/dist/manifest.appcache',
        cache: {
          patterns: [
            'static/audio/**/*',
            'static/dist/**/*',
            'static/fonts/**/*',
            'static/img/**/*',
            '!static/img/promo/**/*',
          ]
        },
        network: '*'
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
  });

  grunt.task.run('notify_hooks');

  // Default tasks
  grunt.registerTask('mmjs', 'Build the JS resources', [
    'copy:libphonenumber',
    'browserify:dist',
    'replace:hardcodeappsettings',
    'replace:monkeypatchdate',
    'replace:monkeypatchpouch',
    'ngtemplates'
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'copy:enketo-css',
    'sass',
    'less',
    'replace:monkeypatchfontawesome',
    'postcss'
  ]);

  grunt.registerTask('compileddocs', 'Compile all Ddocs', [
    'exec:compileddoc:erlang_filters'
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'exec:deploy',
    'notify:deployed'
  ]);

  grunt.registerTask('default', 'Build the static resources', [
    'mmcss',
    'mmjs',
    'copy:enketo-xslt',
    'copy:inbox',
    'appcache',
    'compileddocs'
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
    'exec:deployci'
  ]);

  grunt.registerTask('dev', 'Build and deploy for dev', [
    'npm-install',
    'default',
    'deploy',
    'watch'
  ]);

  grunt.registerTask('test', 'Lint, unit, and integration test', [
    'jshint',
    'karma:unit',
    'nodeunit',
    'protractor'
  ]);

  grunt.registerTask('test_continuous', 'Lint, unit test running on a loop', [
    'jshint',
    'karma:unit_continuous'
  ]);

};
