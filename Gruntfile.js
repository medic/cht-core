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
        'static/js/*.js'
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
          return 'kanso push http://' + grunt.option('user') + ':' + 
            grunt.option('pass') + '@localhost:5984/medic';
        }
      },
      bower: {
        cmd: 'bower install'
      }
    },
    watch: {
      css: {
        files: ['static/css/**/*'],
        tasks: ['less', 'exec:deploy']
      },
      js: {
        files: ['static/js/**/*', 'lib/**/*'],
        tasks: ['jshint', 'uglify', 'exec:deploy']
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default tasks
  grunt.registerTask('default', [
    'jshint',
    'exec:bower',
    'bower_concat',
    'uglify',
    'less',
    'copy:inbox',
    'copy:admin'
  ]);

  grunt.registerTask('dev', [
    'default',
    'exec:deploy'
  ]);

};