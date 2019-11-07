if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Columns = require( 'enketo-core/src/widget/columns/columns' ).default;

    var pluginName = 'horizontalchoices';

    function HorizontalChoices( element, options ) {
        this.namespace = pluginName;
        Object.assign(this, new Columns(element, options));
        this._init();
    }

    //copy the prototype functions from the Columns super class
    HorizontalChoices.prototype = Object.create( Columns.prototype );

    HorizontalChoices.selector = '.or-appearance-horizontal';
    HorizontalChoices.condition = Columns.condition;

    module.exports = HorizontalChoices;

} );
