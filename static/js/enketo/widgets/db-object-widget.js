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
        var translate = angularServices.get('translateFilter');
        var DB = angularServices.get('DB').get();
        var ContactSchema = angularServices.get('ContactSchema');
        var e = $(this.element);

        var loader = $('<div class="loader"/></div>');
        var textInput = e.find('input');
        var initialValue = textInput.val();
        var container = $('<div/>');
        var dbObjectType = textInput.attr('data-type-xml');
        container.append(loader);
        textInput.replaceWith(container);

        var titleString = ContactSchema.get(dbObjectType).title;
        var titleFor = function(doc) {
            return titleString.replace(/\{\{[^}]*\}\}/g, function(m) {
                return doc[m.substring(2, m.length-2)];
            });
        };

        DB.query('medic/doc_by_type', {include_docs:true, key:[dbObjectType]})
            .then(function(res) {
                loader.remove();
                // TODO only include `new` option if it's configured for that
                var selecter = $('<select><option></option></select>');
                selecter.attr('name', textInput.attr('name'));
                selecter.attr('required', textInput.attr('required'));
                selecter.attr('data-type-xml', textInput.attr('data-type-xml'));
                container.append(selecter);

                // add 'new' option TODO this should only be added if requested
                $('<option>', { value:'NEW', text:translate('contact.type.' + dbObjectType + '.new') })
                        .appendTo(selecter);

                var rows = _.sortBy(res.rows, function(row) {
                    return titleFor(row.doc);
                });
                _.forEach(rows, function(row) {
                    var val = row.id;
                    var selected = row.id === initialValue? 'selected' : '';
                    selecter.append('<option value="' + val + '" ' + selected + '>' + titleFor(row.doc) + '</option>');
                });
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
