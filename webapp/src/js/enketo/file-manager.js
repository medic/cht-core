if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var fileManager = require( 'enketo-core/src/js/file-manager' ).default;

    fileManager.isTooLarge = function( file ) {
        return file && file.size > 32 * 1024;
    };

    fileManager.getMaxSizeReadable = function () {
      return '32KB';
    };


    module.exports = fileManager;

} );
