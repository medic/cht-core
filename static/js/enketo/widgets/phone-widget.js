if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var FormModel = require( 'enketo-core/src/js/Form-model' );
    var Widget = require( 'enketo-core/src/js/Widget' );
    var $ = require( 'jquery' );
    var libphonenumber = require( 'libphonenumber/utils' );
    require( 'enketo-core/src/js/plugins' );

    var pluginName = 'phonewidget';

    // Set up enketo validation for `phone` input type
    FormModel.prototype.types.tel = {
        validate: function( fieldValue ) {
            var angularServices = angular.element( document.body ).injector();
            var Settings = angularServices.get( 'Settings' );

            return Settings()
                .then( function( settings ) {
                    if ( !libphonenumber.validate( settings, fieldValue ) ) {
                        throw new Error( 'invalid phone number: "' + fieldValue + '"' );
                    }
                    return libphonenumber.format( settings, fieldValue );
                } )
                .then( function( phoneNumber ) {
                    // Check the phone number is unique.  N.B. this makes the
                    // assumption that we have an object type `person` with a
                    // field `phone`.

                    var options = {
                        params: {
                            key: [ phoneNumber ]
                        }
                    };
                    var DbView = angularServices.get( 'DbViewP' );
                    return DbView( 'person_by_phone', options );
                } )
                .then( function( res ) {
                    var results = res.results;
                    if ( results.rows.length === 0 ) {
                        return true;
                    }

                    // TODO surely there's a nicer way to get this.  We should
                    // probably include the ID(s) of entities we're editing in
                    // then enketo model.
                    var contactId = angular.element( $( '.enketo form' ) ).scope().enketo_contact.docId;
                    if ( results.rows[ 0 ].id !== contactId ) {
                        throw new Error( 'phone number not unique: "' + fieldValue + '"' );
                    }

                    return true;
                } );
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

    function PhoneWidget( element, options, Settings ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        if ( !Settings ) {
            var angularInjector = angular.element( document.body ).injector();
            Settings = angularInjector.get( 'Settings' );
        }
        this._init( Settings );
    }

    //copy the prototype functions from the Widget super class
    PhoneWidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    PhoneWidget.prototype.constructor = PhoneWidget;

    PhoneWidget.prototype._init = function( Settings ) {
        var $input = $( this.element );
        $input.hide();

        // Add a proxy input field, which will send its input, formatted, to the real input field.
        // TODO(estellecomment): format the visible field onBlur to user-friendly format.
        var proxyName = $input.attr( 'name' ) + '_proxy';
        var $proxyInput = $input.clone();
        $proxyInput.attr( 'name', proxyName );
        // Remove some enketo-specific attributes which confuse Enketo.
        // Not needed for a display-only field.
        $proxyInput.removeAttr( 'data-type-xml' );
        $proxyInput.removeAttr( 'required' );
        $input.after( $proxyInput );
        $proxyInput.val( $input.val() );
        $proxyInput.show();

        // TODO(estellecomment): move this to a catch clause, when settings aren't found.
        formatAndCopy( $proxyInput, $input, {} );

        this.builtPromise = Settings()
            .then( function( settings ) {
                formatAndCopy( $proxyInput, $input, settings );
            } );
    };

    function formatAndCopy( $from, $to, settings ) {
        $from.change( function() {
            // Also trigger the change() event, since input was not by user.
            $to.val( getFormattedValue( settings, $from.val() ) ).change();
        } );
    }

    function getFormattedValue( settings, value ) {
        if ( libphonenumber.validate( settings, value ) ) {
            return libphonenumber.format( settings, value );
        } else {
            // Return the non-formatted value, so that the "invalid value" error can display.
            return value;
        }
    }

    PhoneWidget.prototype.destroy = function( /* element */) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new PhoneWidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[type="tel"]',
        'widget': PhoneWidget
    };
} );
