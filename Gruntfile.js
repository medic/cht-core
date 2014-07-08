module.exports = function(grunt) {

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
        dest: 'bower_components/concat.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! Medic Mobile <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        files: {
          'static/js/compiled/inbox.min.js': [
            'bower_components/concat.js',
            'static/js/inbox.js',
            'static/js/controllers.js',
            'static/js/services.js'
          ]
        }
      }
    },
    jshint: {
      all: [
        'Gruntfile.js',
        'static/js/inbox.js',
        'static/js/services.js',
        'static/js/controllers.js'
      ]
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default tasks
  grunt.registerTask('default', [
    'jshint',
    'bower:install',
    'bower_concat',
    'uglify'
  ]);

};