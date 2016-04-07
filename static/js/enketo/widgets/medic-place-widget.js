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
    var format = require('../../modules/format');
    require('enketo-core/src/js/plugins');

    var pluginName = 'medicplacewidget';

    /**
     * Allows drop-down selectors for places.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Medicplacewidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Medicplacewidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Medicplacewidget.prototype.constructor = Medicplacewidget;

    Medicplacewidget.prototype._init = function() {
        var angularServices = angular.element(document.body).injector();
        var ContactSchema = angularServices.get('ContactSchema');
        var DB = angularServices.get('DB').get();
        var translate = angularServices.get('$translate').instant;

        var textInput = $(this.element);
        var $question = textInput.closest('.question');
        var $parent = textInput.parent();
        textInput.replaceWith(textInput[0].outerHTML.replace(/^<input /, '<select ').replace(/<\/input>/, '</select>'));
        textInput = $parent.find('select');

        var loader = $('<div class="loader"/></div>');
        textInput.after(loader);

        var formatResult = function(row) {
            if(row.doc) {
                // format escapes the content for us, and if we just return
                // a string select2 escapes it again, so return an element instead.
                return $('<span>' + format.clinic(row.doc) + '</span>');
            }
            return translate('contact.type.' + row.text);
        };

        var formatSelection = function(row) {
            if(row.doc) {
                return row.doc.name;
            }
            return row.text;
        };

        var matcher = function(params, data) {
            var doc = data && data.doc;
            if (!doc) {
                return null;
            }
            var term = params.term && params.term.toLowerCase();
            if (!term) {
                return data;
            }
            var match = false;
            Object.keys(doc).forEach(function(key) {
                if (typeof doc[key] === 'string' && doc[key].toLowerCase().indexOf(term) !== -1) {
                    match = true;
                }
            });
            return match ? data : null;
        };

        var placeTypes = _.map(_.without(Object.keys(ContactSchema.get()), 'person'), function(type) {
            return [ type ];
        });

        DB.query('medic/doc_by_type', { include_docs: true, keys: placeTypes })
            .then(function(res) {
                loader.remove();

                var groups = _.chain(res.rows)
                        .groupBy(function(row) {
                            return row.doc.type;
                        })
                        .collect(function(children, type) {
                            children.sort(function(a, b) {
                                return a.doc.name < b.doc.name ? -1 : 1;
                            });
                            return { text: type, children: children, id: type };
                        })
                        .value();

                $.fn.select2.amd.require([
                'select2/dropdown/attachContainer',
                'select2/dropdown/closeOnSelect',
                'select2/dropdown',
                'select2/dropdown/search',
                'select2/utils',
                ], function (AttachContainer, CloseOnSelect, DropdownAdapter, DropdownSearch, Utils) {
                    var CustomAdapter = Utils.Decorate(Utils.Decorate(Utils.Decorate(
                        DropdownAdapter, DropdownSearch), AttachContainer), CloseOnSelect);

                    textInput.select2({
                        data: groups,
                        dropdownAdapter: CustomAdapter,
                        templateResult: formatResult,
                        templateSelection: formatSelection,
                        matcher: matcher,
                        selectOnClose: true,
                        width: '100%',
                    });

                    // Tell enketo to ignore the new <input> field that select2 adds
                    $question.find('input.select2-search__field').addClass('ignore');
                });

                if (!$question.hasClass('or-appearance-bind-id-only')) {
                    textInput.on('change', function() {
                        var selected = textInput.select2('data');
                        var doc = selected && selected[0] && selected[0].doc;
                        if (doc) {
                            var form = textInput.closest('form.or');
                            var field = textInput.attr('name');
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

    Medicplacewidget.prototype.destroy = function( /* element */ ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Medicplacewidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[data-type-xml=medic-place]',
    };
} );
