if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Widget = require( '@medic/enketo-core/src/js/Widget' );
    var $ = require( 'jquery' );
    require( '@medic/enketo-core/src/js/plugins' );
    var bikram_sambat_bs = require( 'bikram-sambat-bootstrap' );

    var pluginName = 'bikramsambatdatepicker';

    function Bikramsambatdatepicker( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Bikramsambatdatepicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Bikramsambatdatepicker.prototype.constructor = Bikramsambatdatepicker;

    Bikramsambatdatepicker.prototype._init = function() {
        var cookies = {};
        document.cookie.split( ';' ).forEach(function( s ) {
            var c = s.trim().split( '=' );
            cookies[ c[ 0 ] ] = c[ 1 ];
        });

        if ( cookies.locale !== 'ne' ) {
            return;
        }

        var $el = $( this.element );
        var $parent = $el.parent();

        // Remove standard date widget:
        $parent.children( '.widget.date' ).remove();

        $parent.append( TEMPLATE );
        bikram_sambat_bs.initListeners( $parent );
        bikram_sambat_bs.addChangeListener( $parent, function() {
            var $inputGroup = $( this ).closest( '.bikram-sambat-input-group' );
            var greg = bikram_sambat_bs.getDate_text( $inputGroup );
            $( this ).closest( '.question' )
                    .find( 'input[type=date]' )
                    .val( greg )
                    .trigger( 'change' );
        } );
    };

    Bikramsambatdatepicker.prototype.destroy = function( element ) {
        /* jshint unused:false */
    };

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Bikramsambatdatepicker( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[type=date]'
    };
} );

var TEMPLATE =
        '<div class="input-group bikram-sambat-input-group">' +
            '<input name="day" type="tel" class="form-control devanagari-number-input" placeholder="गते" aria-label="गते" maxlength="2">' +
            '<input name="month" type="hidden">' +
            '<div class="input-group-btn">' +
                '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
                    'महिना <span class="caret"></span>' +
                '</button>' +
                '<ul class="dropdown-menu">' +
                    '<li><a>बैशाख</a></li>' +
                    '<li><a>जेठ</a></li>' +
                    '<li><a>असार</a></li>' +
                    '<li><a>साउन</a></li>' +
                    '<li><a>भदौ</a></li>' +
                    '<li><a>असोज</a></li>' +
                    '<li><a>कार्तिक</a></li>' +
                    '<li><a>मंसिर</a></li>' +
                    '<li><a>पौष</a></li>' +
                    '<li><a>माघ</a></li>' +
                    '<li><a>फाल्गुन</a></li>' +
                    '<li><a>चैत</a></li>' +
                '</ul>' +
            '</div>' +
            '<input name="year" type="tel" class="form-control devanagari-number-input" placeholder="साल" aria-label="साल" maxlength="4">' +
        '</div>';
