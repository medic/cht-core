'use strict';
const fileManager = require( 'enketo-core/src/js/file-manager' ).default;

fileManager.isTooLarge = function( file ) {
  return file && file.size > 32 * 1024;
};

fileManager.getMaxSizeReadable = function () {
  return '32KB';
};

// Exposing to overwrite enketo's file-manager with these file size defaults
module.exports = fileManager;
