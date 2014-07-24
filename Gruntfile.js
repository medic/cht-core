module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    bower: {
      install: {
        options: {
          targetDir: 'bower_components'
        }
      }
    },
    bower_concat: {
      all: {
        dest: 'bower_components/concat.js',
        exclude: [ 'fontawesome' ]
      }
    },
    uglify: {
      options: {
        banner: '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          'static/dist/inbox.js': [
            'bower_components/concat.js',
            'static/js/bootstrap-multidropdown.js',
            'static/js/inbox.js',
            'static/js/app.js',
            'static/js/filters.js',
            'static/js/controllers.js',
            'static/js/services.js'
          ]
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
        'static/js/*.js',
        'tests_ui/**/*.js'
      ]
    },
    less: {
      all: {
        files: {
          'static/dist/app.css': 'static/css/app.less',
          'static/dist/inbox.css': 'static/css/inbox.less'
        }
      }
    },
    autoprefixer: {
      all: {
        src: 'static/dist/*.css'
      },
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
          }
        ]
      },
      admin: {
        files: [
          {
            expand: true,
            flatten: true,
            src: [
              'bower_components/select2/select2.js',
              'bower_components/raphael/raphael.js'
            ], 
            dest: 'static/dist/'
          }
        ]
      }
    },
    exec: {
      deploy: {
        cmd: function() {
          var auth = '';
          if (grunt.option('user') && grunt.option('pass')) {
            auth = grunt.option('user') + ':' + grunt.option('pass') + '@';
          }
          return 'kanso push http://' + auth + 'localhost:5984/medic';
        }
      },
      bower: {
        cmd: 'bower install'
      },
      phantom: {
        cmd: 'phantomjs scripts/nodeunit_runner.js http://localhost:5984/medic/_design/medic/_rewrite/test'
      }
    },
    watch: {
      css: {
        files: ['static/css/**/*'],
        tasks: ['mmcss', 'exec:deploy', 'notify:deployed']
      },
      js: {
        files: ['static/js/**/*'],
        tasks: ['mmjs', 'exec:deploy', 'notify:deployed']
      },
      other: {
        files: ['templates/**/*', 'lib/**/*', 'packages/kujua-*/**/*'],
        tasks: ['exec:deploy', 'notify:deployed']
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
        configFile: './tests_ui/karma-unit.conf.js',
        singleRun: true,
        browsers: ['Chrome', 'Firefox']
      },
      unit_ci: {
        configFile: './tests_ui/karma-unit.conf.js',
        singleRun: true,
        browsers: ['PhantomJS']
      }
    },
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-autoprefixer');

  grunt.task.run('notify_hooks');

  // Default tasks
  grunt.registerTask('mmjs', [
    'jshint',
    'uglify'
  ]);

  grunt.registerTask('mmcss', [
    'less',
    'autoprefixer'
  ]);

  grunt.registerTask('mmbower', [
    'exec:bower',
    'bower_concat',
    'copy:inbox',
    'copy:admin'
  ]);

  grunt.registerTask('default', [
    'mmbower',
    'mmjs',
    'mmcss'
  ]);

  grunt.registerTask('ci', [
    'default',
    'karma:unit_ci',
    'exec:deploy',
    'exec:phantom'
  ]);

  grunt.registerTask('dev', [
    'default',
    'exec:deploy',
    'notify:deployed'
  ]);

  grunt.registerTask('test', [
    'karma:unit',
    'exec:phantom'
  ]);

};