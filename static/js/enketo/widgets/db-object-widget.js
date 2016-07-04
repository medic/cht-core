if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var _ = require('underscore');
    var Widget = require('enketo-core/src/js/Widget');
    var $ = require('jquery');
    var select2Ajax = require('../../modules/select2-ajax');

    require('enketo-core/src/js/plugins');

    var pluginName = 'dbobjectwidget';

    /**
     * Allows drop-down selectors for db objects.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Dbobjectwidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Dbobjectwidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Dbobjectwidget.prototype.constructor = Dbobjectwidget;

    Dbobjectwidget.prototype._init = function() {
        var angularServices = angular.element(document.body).injector();
        var translate = angularServices.get('$translate').instant,
            Search = angularServices.get('Search'),
            $q = angularServices.get('$q'),
            DB = angularServices.get('DB'),
            Session = angularServices.get('Session');

        var $question = $(this.element);

        var $textInput = $question.find('input');
        var value = $textInput.val();
        $textInput.replaceWith($textInput[0].outerHTML.replace(/^<input /, '<select ').replace(/<\/input>/, '</select>'));
        $textInput = $question.find('select');
        var preSelectedOption = $('<option></option>')
                  .attr('value', value)
                  .text(value);
        $textInput.append(preSelectedOption);

        var dbObjectType = $textInput.attr('data-type-xml');

        select2Ajax.init(translate, Search, DB, $q, Session)($textInput, dbObjectType, {
            allowNew: $question.hasClass('or-appearance-allow-new')
        }).then(function() {
            if (!$question.hasClass('or-appearance-bind-id-only')) {
                $textInput.on('change', function() {
                    var selected = $textInput.select2('data');
                    var doc = selected && selected[0] && selected[0].doc;
                    if (doc) {
                        var form = $question.closest('form.or');
                        var field = $question.find('select[name]').attr('name');
                        var objectRoot = field.substring(0, field.lastIndexOf('/'));
                        updateFields(form, doc, objectRoot, field);
                    }
                });
            }
        });
    };

    var updateFields = function(form, doc, objectRoot, keyPath) {
        Object.keys(doc).forEach(function(key) {
            var path = objectRoot + '/' + key;
            if (path === keyPath) {
                // don't update the field that fired the update
                return;
            }
            var value = doc[key];
            if (_.isArray(value)) {
                // arrays aren't currently handled
                return;
            }
            if (_.isObject(value)) {
                // recursively set fields for children
                return updateFields(form, value, path, keyPath);
            }
            form.find('[name="' + path + '"]')
                .val(value)
                .trigger('change');
        });
    };

    Dbobjectwidget.prototype.destroy = function( /* element */ ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Dbobjectwidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-db-object',
    };
} );
