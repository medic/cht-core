var remapify = require('remapify');

module.exports = function(grunt) {

  'use strict';

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
          'select2-bootstrap-css',
          'bootstrap-tour', // Including this includes two copies. Manually included in concat.
          'angular-mocks'
        ]
      }
    },
    replace: {
      monkeypatchdate: {
        src: ['bower_components/concat.js'],
        overwrite: true,
        replacements: [{
          from: /clickDate: function \(e\) \{/g,
          to: 'clickDate: function (e) {\n\n// MONKEY PATCH BY GRUNT: Needed for the mobile version.\nthis.element.trigger(\'mm.dateSelected.daterangepicker\', this);\n'
        }]
      },
      monkeypatchselect: {
        src: ['bower_components/concat.js'],
        overwrite: true,
        replacements: [{
          from: /if \(self\.opts\.selectOnBlur\) \{/g,
          to: 'if (self.opts.selectOnBlur\n// MONKEY PATCH BY GRUNT: Needed for select freetext on blur #699.\n || (self.opts.selectFreetextOnBlur && self.results.find(".select2-highlighted .freetext").length)) {\n'
        }]
      }
    },
    browserify: {
      options: {
        preBundleCB: function(b) {
          b.ignore('./flashmessages')
           .plugin(remapify, browserifyMappings);
        }
      },
      dist: {
        src: ['static/js/app.js'],
        dest: 'static/dist/inbox.js',
        browserifyOptions: {
          detectGlobals: false,
          external: ['moment', 'underscore']
        }
      }
    },
    concat: {
      js: {
        src: [
          'bower_components/concat.js',
          'bower_components/bootstrap-tour/build/js/bootstrap-tour.js',
          'static/js/bootstrap-multidropdown.js'
        ],
        dest: 'static/dist/dependencies.js',
      },
      enketo_js: {
        src: ['static/enketo/js/*.js'],
        dest: 'static/dist/enketo.js',
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
          'static/dist/enketo.js': ['static/dist/enketo.js'],
        }
      }
    },
    jshint: {
      options: {
        jshintrc: true,
        ignores: [
          'static/js/*.min.js',
          'static/js/bootstrap-datetimepicker.js',
          'static/js/jquery-ext.js',
          'static/js/json2.js',
          'static/js/browser.js'
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
          'static/dist/admin.css': 'static/css/admin.less',
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
          'static/dist/admin.css': 'static/dist/admin.css',
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
              'bower_components/select2/*.gif',
              'bower_components/select2/*.png'
            ],
            dest: 'static/dist/'
          },
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
      admin: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [ 'bower_components/select2/select2.js' ],
            dest: 'static/dist/'
          }
        ]
      },
      enketo: {
        expand:true,
        cwd: 'static/',
        src: ['enketo/**/*', '!enketo/js/**'],
        dest: 'static/dist/',
      },
    },
    exec: {
      deploy: {
        cmd: 'kanso push'
      },
      deployci: {
        cmd: 'kanso push http://localhost:5984/medic'
      },
      phantom: {
        cmd: 'phantomjs scripts/nodeunit_runner.js http://localhost:5984/medic/_design/medic/_rewrite/test'
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
        browsers: ['Chrome', 'Firefox']
      },
      unit_ci: {
        configFile: './tests/karma/karma-unit.conf.js',
        singleRun: true,
        browsers: ['PhantomJS']
      }
    },
    protractor: {
      default: {
        options: {
          configFile: 'tests/protractor/conf.js'
        }
      },
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
            'static/dist/**/*',
            'static/fonts/**/*',
            'static/img/**/*',
            '!static/img/promo/**/*'
          ]
        },
        network: '*'
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-angular-templates');
  grunt.loadNpmTasks('grunt-appcache');
  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-npm-install');
  grunt.loadNpmTasks('grunt-postcss');
  grunt.loadNpmTasks('grunt-protractor-runner');
  grunt.loadNpmTasks('grunt-text-replace');

  grunt.task.run('notify_hooks');

  // Default tasks
  grunt.registerTask('mmjs', 'Build the JS resources', [
    'browserify:dist',
    'ngtemplates',
    'concat:js',
    'concat:enketo_js',
  ]);

  grunt.registerTask('mmcss', 'Build the CSS resources', [
    'less',
    'postcss'
  ]);

  grunt.registerTask('mmbower', 'Install, concat, and patch bower components', [
    'bower:install',
    'bower_concat',
    'replace:monkeypatchdate',
    'replace:monkeypatchselect',
    'copy:inbox',
    'copy:admin'
  ]);

  grunt.registerTask('enketo', 'Copy static resources required by enketo to dist/', [
    'copy:enketo'
  ]);

  grunt.registerTask('deploy', 'Deploy the webapp', [
    'exec:deploy',
    'notify:deployed'
  ]);

  grunt.registerTask('default', 'Build the static resources', [
    'mmbower',
    'mmcss',
    'mmjs',
    'appcache',
    'enketo'
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
    'exec:deployci',
    'exec:phantom'
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
    'protractor'
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
