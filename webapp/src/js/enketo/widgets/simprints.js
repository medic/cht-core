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

    var pluginName = 'simprintswidget';

    /**
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */
    function Simprintswidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Simprintswidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Simprintswidget.prototype.constructor = Simprintswidget;

    Simprintswidget.prototype._init = function() {
        var $el = $( this.element );
        var $input = $el.find( 'input' );
        $input.attr( 'disabled', true );
        var angularServices = angular.element( document.body ).injector();
        var $translate = angularServices.get( '$translate' );
        var service = angularServices.get( 'Simprints' );

        if ( !service.enabled() ) {
            $translate( 'simprints.disabled' ).then(function( label ) {
                $el.append( '<p>' + label + '</p>' );
            });
            return;
        }

        $el.on( 'click', '.btn.simprints-register', function() {
            service.register().then( function(simprintsId) {
                $input.val( simprintsId ).trigger( 'change' );
            } );
        } );

        $translate( 'simprints.register' ).then( function( label ) {
            $el.append( '<div><a class="btn btn-default simprints-register"><img src="img/simprints.png" width="20" height="20"/> ' + label + '</a></div>' );
        } );
    };

    Simprintswidget.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Simprintswidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-simprints-reg',
    };
} );
