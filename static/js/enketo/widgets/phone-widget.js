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
            var angularServices = angular.element(document.body).injector();
            var Settings = angularServices.get('SettingsP');

            return Settings()
                .then(function(settings) {
                    var phoneNumber = libphonenumber.format(settings, fieldValue);
                    if (!libphonenumber.validate(settings, phoneNumber)) {
                        throw new Error('invalid phone number: "' + phoneNumber + '"');
                    }
                    return phoneNumber;
                })
                .then(function(phoneNumber) {
                    // Check the phone number is unique.  N.B. this makes the
                    // assumption that we have an object type `person` with a
                    // field `phone`.

                    var options = { params: { key: [ phoneNumber ] } };
                    var DbView = angularServices.get('DbViewP');
                    return DbView('person_by_phone', options);
                })
                .then(function(res) {
                    var results = res.results;
                    if (results.rows.length === 0) {
                        return true;
                    }

                    // TODO surely there's a nicer way to get this.  We should
                    // probably include the ID(s) of entities we're editing in
                    // then enketo model.
                    var contactId = angular.element($('.enketo form')).scope().enketo_contact.docId;
                    if (results.rows[0].id !== contactId) {
                        throw new Error('phone number not unique: "' + fieldValue + '"');
                    }

                    return true;
                });
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
        'selector': '',
    };
} );
