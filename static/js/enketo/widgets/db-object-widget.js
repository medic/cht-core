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

        var textInput = $(this.element).find('input');
        textInput.attr('type', 'hidden');
        var dbObjectType = textInput.attr('data-type-xml');

        var loader = $('<div class="loader"/></div>');
        textInput.after(loader);

        DB.query('medic/doc_by_type', {include_docs:true, key:[dbObjectType]})
            .then(function(res) {
                loader.remove();

                var rows = _.sortBy(res.rows, function(row) {
                    return row.doc.name;
                });

                // add 'new' option TODO this should only be added if requested
                rows.unshift({
                    id: 'NEW',
                    text: translate('contact.type.' + dbObjectType + '.new'),
                });
                // add blank option
                rows.unshift({ id: '', text: '&nbsp;' });

                textInput.select2({
                    data: rows,
                    formatResult: formatResult,
                    formatSelection: formatResult,
                    width: '100%',
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
