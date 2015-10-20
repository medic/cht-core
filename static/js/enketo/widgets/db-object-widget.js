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
    var format = require('../../modules/format');

    var pluginName = 'dbobjectwidget';

    /**
     * Allows drop-down selecters for db objects.
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
        var translate = angularServices.get('$translate').instant;
        var DB = angularServices.get('DB').get();

        var formatResult = function(row) {
            if(!row.doc) {
                return row.text;
            }
            if(row.doc.type === 'person') {
                return format.contact(row.doc);
            }
            return format.clinic(row.doc);
        };

        var $question = $(this.element);
        var textInput = $question.find('input');
        var dbObjectType = textInput.attr('data-type-xml');

        var loader = $('<div class="loader"/></div>');
        textInput.after(loader);

        DB.query('medic/doc_by_type', {include_docs:true, key:[dbObjectType]})
            .then(function(res) {
                loader.remove();

                var rows = _.sortBy(res.rows, function(row) {
                    return row.doc.name;
                });

                // add 'new' option if requested
                if ($question.hasClass('or-appearance-allow-new')) {
                    rows.unshift({
                        id: 'NEW',
                        text: translate('contact.type.' + dbObjectType + '.new'),
                    });
                }
                // add blank option
                rows.unshift({ id: '', text: '&nbsp;' });

                textInput.select2({
                    data: rows,
                    formatResult: formatResult,
                    formatSelection: formatResult,
                    width: '100%',
                });

                // Tell enketo to ignore the new <input> field that select2 adds
                textInput.parent().find('input.select2-focusser').addClass('ignore');

                // apologies - here we open and close the select2 - this works
                // around a bug which would otherwise ignore the `required`
                // attribute.
                textInput.select2('open');
                textInput.select2('close');

                if (!$question.hasClass('or-appearance-bind-id-only')) {
                    textInput.on('change', function(e) {
                        var form = $question.closest('form.or');
                        var field = $question.find('input[name]').attr('name');
                        var objectRoot = field.substring(0, field.lastIndexOf('/'));
                        updateFields(form, e.added.doc, objectRoot, field);
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
