if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Widget = require('enketo-core/src/js/Widget');
    var $ = require( 'jquery' );
    require('enketo-core/src/js/plugins');

    var pluginName = 'mrdtwidget';

    /**
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */
    function Mrdtwidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Mrdtwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Mrdtwidget.prototype.constructor = Mrdtwidget;

    Mrdtwidget.prototype._init = function() {
        var self = this;
        var $el = $( this.element );
        var $input = $el.find( 'input' );

        // we need to make it a textarea because text inputs strip out the
        // \n (new line) characters which breaks the encoded file content.
        var textarea = $input[0].outerHTML
            .replace(/^<input /, '<textarea ')
            .replace(/<\/input>/, '</textarea>');
        $input.replaceWith(textarea);
        var angularServices = angular.element( document.body ).injector();
        var $translate = angularServices.get( '$translate' );
        var service = angularServices.get( 'MRDT' );

        if ( !service.enabled() ) {
            $translate( 'mrdt.disabled' ).then(function( label ) {
                $el.append( '<p>' + label + '</p>' );
            });
            return;
        }

        $el.on( 'click', '.btn.mrdt-verify', function() {
            service.verify().then( function(image) {
                $( self.element )
                    .find( 'textarea' )
                    .val( image )
                    .trigger( 'change' );
                $( self.element )
                    .find( '.mrdt-preview' )
                    .attr('src', 'data:image/png;base64, ' + image);
            } );
        } );

        $translate( 'mrdt.verify' ).then( function( label ) {
            $el.append(
                '<div><a class="btn btn-default mrdt-verify">' + label + '</a></div>' +
                '<div><img class="mrdt-preview"/></div>'
            );
        } );
    };

    Mrdtwidget.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Mrdtwidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-mrdt-verify',
    };
} );

