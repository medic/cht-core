if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Filepicker = require( 'enketo-core/src/widget/file/filepicker' ).default;

    function FilepickerWidget( element, options ) {
        Object.assign(this, new Filepicker(element, options));
    }

    //copy the prototype functions from the Filepicker super class
    FilepickerWidget.prototype = Object.create( Filepicker.prototype );
    FilepickerWidget.selector = Filepicker.selector;
    FilepickerWidget.condition = function() { return true; };

    module.exports = FilepickerWidget;
} );
