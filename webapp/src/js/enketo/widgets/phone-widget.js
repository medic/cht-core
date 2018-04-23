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
    var phoneNumber = require('phone-number');
    require( 'enketo-core/src/js/plugins' );

    var pluginName = 'phonewidget';

    // Set up enketo validation for `phone` input type
    FormModel.prototype.types.tel = {
        validate: function( fieldValue ) {
            var angularServices = angular.element( document.body ).injector();
            var Settings = angularServices.get( 'Settings' );

            return Settings()
                .then( function( settings ) {
                    if ( !phoneNumber.validate( settings, fieldValue ) ) {
                        throw new Error( 'invalid phone number: "' + fieldValue + '"' );
                    }
                    return phoneNumber.normalize( settings, fieldValue );
                } )
                .then( function( phoneNumber ) {
                    // Check the phone number is unique.  N.B. this makes the
                    // assumption that we have an object type `person` with a
                    // field `phone`.

                    var DB = angularServices.get( 'DB' );
                    return DB().query('medic-client/contacts_by_phone', { key: phoneNumber });
                } )
                .then( function( res ) {
                    if ( res.rows.length === 0 ) {
                        return true;
                    }

                    var contactBeingEdited = $('#contact-form').attr('data-editing');
                    if ( res.rows[ 0 ].id !== contactBeingEdited ) {
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

        // Add a proxy input field, which will send its input, formatted, to the real input field.
        // TODO(estellecomment): format the visible field onBlur to user-friendly format.
        var $proxyInput = $input.clone();
        $proxyInput.addClass('ignore');
        $proxyInput.removeAttr('data-relevant');
        $proxyInput.removeAttr('name');
        $input.before( $proxyInput );
        $proxyInput.val( $input.val() );

        $input.hide();

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
        // If invalid, return the non-formatted value,
        // so that the "invalid value" error can display.
        return phoneNumber.normalize( settings, value ) || value;
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
