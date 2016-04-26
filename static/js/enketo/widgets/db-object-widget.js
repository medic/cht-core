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

    var PAGE_SIZE = 20;

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
        var aS = angular.element(document.body).injector();
        var translate = aS.get('$translate').instant,
            Search = aS.get('Search'),
            DB = aS.get('DB').get();

        var formatResult = function(row) {
            if(!row.doc) {
                return $('<p>' + (row.text || '&nbsp;') + '</p>');
            }
            if(row.doc.type === 'person') {
                return $(format.contact(row.doc));
            }
            // format escapes the content for us, and if we just return
            // a string select2 escapes it again, so return an element instead.
            return $('<span>' + format.clinic(row.doc) + '</span>');
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

        var prepareRows = function(documents, first) {
            var rows = _.sortBy(documents, function(doc) {
                return doc.name;
            }).map(function(doc) {
                return {
                    id: doc._id,
                    doc: doc
                };
            });

            if (first) {
                // add 'new' option if requested
                if ($question.hasClass('or-appearance-allow-new')) {
                    rows.unshift({
                        id: 'NEW',
                        text: translate('contact.type.' + dbObjectType + '.new'),
                    });
                }

                // add blank option
                rows.unshift({ id: '' });
            }

            return rows;
        };

        var query = function(params, successCb, failureCb) {
            var query = params.data.q;
            var skip = ((params.data.page || 1) - 1) * PAGE_SIZE;

            Search('contacts',
            {   // filters
                types: [dbObjectType],
                search: query
            }, { // options
                limit: PAGE_SIZE,
                skip: skip
            }, function(err, documents) {
                if (err) {
                    failureCb(err);
                    console.log(dbObjectType + ' failed to load', err);
                }

                successCb({
                    results: prepareRows(documents, skip === 0),
                    pagination: {
                        more: documents.length === PAGE_SIZE
                    }
                });
            });
        };

        DB.get(preSelectedOption.attr('value'))
          .then(function(doc) {
            var text = formatSelection({doc: doc});
            preSelectedOption.text(text);
        }).catch(function(err) {
            console.log('Error resolving initial selection from DB', err);
        }).then(function() {
            $textInput.select2({
                ajax: {
                    delay: 500,
                    transport: query
                },
                templateResult: formatResult,
                templateSelection: formatSelection,
                matcher: matcher,
                minimumInputLength: 3,
                width: '100%',
            });

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
