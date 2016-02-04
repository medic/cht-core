var remapify = require('remapify'),
    kansoJson = require('./kanso.json'),
    path = require('path');

module.exports = function(grunt) {

  'use strict';

  require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  // Project configuration
  grunt.initConfig({
    bower: {
      install: {
        options: {
          copy: false
        }
      }
    },
    bower_concat: {
      all: {
        dest: 'bower_components/concat.js',
        exclude: [
          'fontawesome',
          'async',
          'bootstrap-tour', // Including this includes two copies. Manually included in concat.
          'angular-mocks',
          'select2', // need to manually include the extended version of the lib
        ]
      }
    },
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
        src: [ 'bower_components/concat.js' ],
        overwrite: true,
        replacements: [{
          from: /clickDate: function \(e\) \{/g,
          to: 'clickDate: function (e) {\n\n// MONKEY PATCH BY GRUNT: Needed for the mobile version.\nthis.element.trigger(\'mm.dateSelected.daterangepicker\', this);\n'
        }]
      },
      // cache the ddoc views for performance
      monkeypatchpouchtocacheddoc: {
        src: [ 'bower_components/concat.js' ],
        overwrite: true,
        replacements: [
          {
            from: /function queryPromised\(db, fun, opts\) \{/g,
            to: '// MONKEY PATCH BY GRUNT: cache ddoc views.\nfunction getPersistentViews(db, designDocName) {\n  if (!db.persistentViews) {\n    db.persistentViews = {};\n  }\n  if (!db.persistentViews[designDocName]) {\n    db.persistentViews[designDocName] = db.get(\'_design/\' + designDocName).then(function (doc) {\n      return { views: doc.views };\n   });\n  }\n  return db.persistentViews[designDocName];\n}\n\nfunction queryPromised(db, fun, opts) {\n'
          },
          {
            from: /return db\.get\('_design\/' \+ designDocName\)\.then\(function \(doc\) \{/g,
            to: '// MONKEY PATCH BY GRUNT: cache ddoc views.\n    return getPersistentViews(db, designDocName).then(function (doc) {\n'
          }
        ]
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
      },
      monkeypatchpouchreplication: {
        src:[ 'bower_components/concat.js' ],
        overwrite: true,
        replacements: [
          {
            from: /startChanges\(\);/g,
            to: '// MONKEY PATCH BY GRUNT: emit checkpoints.\n console.log(\'monkey patch\'); \n    returnValue.emit(\'checkpoint\', 0);\n    startChanges();\n'
          },
          {
            from: /return checkpointer\.getCheckpoint\(\)\.then\(function \(checkpoint\) \{/g,
            to: '// MONKEY PATCH BY GRUNT: emit checkpoints.\nreturn checkpointer.getCheckpoint().then(function (checkpoint) {\n console.log(\'monkey patch 2\'); \n    returnValue.emit(\'checkpoint\', checkpoint);\n'
          }
        ]
      }
    },
    browserify: {
      dist: {
        src: ['static/js/app.js'],
        dest: 'static/dist/inbox.js',
        browserifyOptions: {
          detectGlobals: false,
          external: ['moment', 'underscore']
        },
        options: {
          preBundleCB: function(b) {
            b.ignore('./flashmessages')
             .plugin(remapify, browserifyMappings);
          }
        },
      },
      enketo: {
        src: './static/js/enketo/main.js',
        dest: 'build/enketo.js',
        require: [ 'jquery' ],
        options: {
          alias: {
            jquery:'./static/js/enketo/jquery-shim.js',
            'text!enketo-config': './static/js/enketo/config.json',
            'widgets': './static/js/enketo/widgets.js',
            './xpath-evaluator-binding':'./static/js/enketo/OpenrosaXpathEvaluatorBinding.js',
            'extended-xpath': './node_modules/openrosa-xpath-evaluator/src/extended-xpath.js',
            'openrosa-xpath-extensions': './node_modules/openrosa-xpath-evaluator/src/openrosa-xpath-extensions.js',
            'libphonenumber/phoneformat': './packages/libphonenumber/libphonenumber/phoneformat.js',
            'libphonenumber/utils': './packages/libphonenumber/libphonenumber/utils.js',
          },
        },
      }
    },
    concat: {
      dependencies: {
        src: [
          'bower_components/concat.js',
          'bower_components/bootstrap-tour/build/js/bootstrap-tour.js',
          'bower_components/select2/dist/js/select2.full.js',
          'static/js/bootstrap-multidropdown.js'
        ],
        dest: 'static/dist/dependencies.js',
      },
      inbox: {
        src: [
          'static/dist/inbox.js',
          'build/enketo.js',
        ],
        dest: 'static/dist/inbox.js',
      },
    },
    uglify: {
      options: {
        banner: '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          'static/dist/templates.js': ['static/dist/templates.js'],
          'static/dist/dependencies.js': ['static/dist/dependencies.js'],
          'static/dist/inbox.js': ['static/dist/inbox.js'],
        }
      }
    },
    jshint: {
      options: {
        jshintrc: true,
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
              'bower_components/fontawesome/fonts/*'
            ],
            dest: 'static/fonts'
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
        files: ['templates/**/*', 'static/js/**/*', 'packages/kujua-*/**/*', 'packages/feedback/**/*'],
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
        dest: 'static/dist/templates.js'
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
    'browserify:dist',
    'browserify:enketo',
    'replace:hardcodeappsettings',
    'ngtemplates',
    'concat:dependencies',
    'concat:inbox',
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'copy:enketo-css',
    'sass',
    'less',
    'replace:monkeypatchfontawesome',
    'postcss'
  ]);

  grunt.registerTask('mmbower', 'Install, concat, and patch bower components', [
    'bower:install',
    'bower_concat',
    'replace:monkeypatchdate',
    'replace:monkeypatchpouchreplication',
    'replace:monkeypatchpouchtocacheddoc',
    'copy:inbox'
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'exec:deploy',
    'notify:deployed'
  ]);

  grunt.registerTask('default', 'Build the static resources', [
    'mmbower',
    'mmcss',
    'mmjs',
    'copy:enketo-xslt',
    'appcache',
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

  var browserifyMappings = [
    // modules in bower and kanso
    {
      cwd: 'bower_components/underscore',
      src: './underscore.js'
    },
    {
      cwd: 'bower_components/moment',
      src: './moment.js'
    },
    {
      cwd: 'bower_components/moment/min/',
      src: './locales.js',
      expose: 'moment'
    },
    {
      cwd: 'bower_components/async/lib',
      src: './async.js'
    },
    // kanso packages required for inbox
    {
      cwd: 'packages/db',
      src: './db.js'
    },
    {
      cwd: 'packages/kujua-sms/views/lib',
      src: './*.js',
      expose: 'views/lib'
    },
    {
      cwd: 'packages/kujua-sms/kujua-sms',
      src: './utils.js',
      expose: 'kujua-sms'
    },
    {
      cwd: 'packages/kujua-utils',
      src: './kujua-utils.js'
    },
    {
      cwd: 'packages/session',
      src: './session.js'
    },
    {
      cwd: 'packages/duality/duality',
      src: './utils.js',
      expose: 'duality'
    },
    {
      cwd: 'packages/users',
      src: './users.js'
    },
    {
      cwd: 'packages/cookies',
      src: './cookies.js'
    },
    {
      cwd: 'packages/sha1',
      src: './sha1.js'
    },
    {
      cwd: 'packages/dust',
      src: './dust.js'
    },
    {
      cwd: 'packages/libphonenumber/libphonenumber',
      src: './*.js',
      expose: 'libphonenumber'
    },
    {
      cwd: 'packages/feedback',
      src: './feedback.js'
    }
  ];

};
