'use strict';
const fileManager = require( 'enketo-core/src/js/file-manager' ).default;
const enketoConstants = require( './constants' );

fileManager.isTooLarge = function( file ) {
  return file && file.size > enketoConstants.maxAttachmentSize;
};

fileManager.getMaxSizeReadable = function () {
  return enketoConstants.maxAttachmentSizeReadable;
};

// Exposing to overwrite enketo's file-manager with these file size defaults
module.exports = fileManager;
