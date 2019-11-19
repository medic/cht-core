if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var DatepickerExtended = require( 'enketo-core/src/widget/date/datepicker-extended' ).default;

    function Datepicker( element, options ) {
        Object.assign(this, new DatepickerExtended(element, options));
    }

    //copy the prototype functions from the DatepickerExtended super class
    Datepicker.prototype = Object.create( DatepickerExtended.prototype );

    Datepicker.selector = DatepickerExtended.selector;
    Datepicker.condition = function() { return true; };

    module.exports = Datepicker;
} );
