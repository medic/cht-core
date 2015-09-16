if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var FormModel = require( 'enketo-core/src/js/FormModel' );
    var Widget = require( 'enketo-core/src/js/Widget' );
    var $ = require( 'jquery' );
    var libphonenumber = require( 'libphonenumber/utils' );
    require( 'enketo-core/src/js/plugins' );

    var pluginName = 'phonewidget';

    // Set up enketo validation for `phone` input type
    var settings = {}; // TODO these should come from Settings service
    FormModel.types.phone = {
        validate: function( x ) {
            // TODO if number passes validation, check in DB that it's not a duplicate
            return libphonenumber.validate(settings, x);
        },
    };

    /**
     * Allows validated phonenumber entry.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Phonewidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Phonewidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Phonewidget.prototype.constructor = Phonewidget;

    Phonewidget.prototype._init = function() {
    };

    Phonewidget.prototype.destroy = function( /* element */ ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Phonewidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[data-type-xml=phone]', // TODO we don't use this right now, so perhaps unnecessary?
    };
} );
