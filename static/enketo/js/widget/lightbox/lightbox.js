if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Widget = require( 'enketo-core/src/js/Widget' );
    var $ = require( 'jquery' );
    require( 'enketo-core/src/js/plugins' );
    require( './lightbox2/lightbox2' );

    var pluginName = 'lightboxwidget';

    /**
     * Enhances big-images
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Lightboxwidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Lightboxwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Lightboxwidget.prototype.constructor = Lightboxwidget;

    Lightboxwidget.prototype._init = function() {
        var a = $( this.element ),
            id = 'lightbox-' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
            href = a.attr( 'href' );
        a.attr( 'data-lightbox', id );
    };

    Lightboxwidget.prototype.destroy = function( element ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Lightboxwidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'a'
    };
} );

