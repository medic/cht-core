module.exports = function(grunt) {

  'use strict';

  // Project configuration
  grunt.initConfig({
    nodeunit: {
      all: ['tests/node/**/*.js']
    },
    jshint: {
      options: {
        ignores: [
          'node_modules/**'
        ]
      },
      all: [
        '**/*.js'
      ]
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Default tasks
  grunt.registerTask('test', [
    'jshint',
    'nodeunit'
  ]);

};