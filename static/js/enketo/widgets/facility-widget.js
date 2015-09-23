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

    var pluginName = 'facilitywidget';

    /**
     * Allows drop-down selecters for db objects.
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */

    function Facilitywidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    Facilitywidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    Facilitywidget.prototype.constructor = Facilitywidget;

    Facilitywidget.prototype._init = function() {
        var angularServices = angular.element(document.body).injector();
        var ContactSchema = angularServices.get('ContactSchema');
        var DB = angularServices.get('DB').get();
        var e = $(this.element).parent();

        var loader = $('<div class="loader"/></div>');
        var textInput = e.find('input');
        var initialValue = textInput.val();
        var container = $('<div/>');
        container.append(loader);
        textInput.replaceWith(container);

        var titleFor = function(doc) {
            var titleString = ContactSchema.get(doc.type).title;
            return titleString.replace(/\{\{[^}]*\}\}/g, function(m) {
                return doc[m.substring(2, m.length-2)];
            });
        };

        var placeTypes = _.map(_.without(Object.keys(ContactSchema.get()), 'person'), function(type) {
            return [ type ];
        });

        DB.query('medic/doc_by_type', { include_docs: true, keys: placeTypes })
            .then(function(res) {
                loader.remove();
                var selecter = $('<select/>');
                selecter.attr('name', textInput.attr('name'));
                selecter.attr('data-type-xml', textInput.attr('data-type-xml'));
                container.append(selecter);
                // TODO we shouldn't have to manually remove persons here!
                var rows = _.filter(res.rows, function(row) {
                    return row.doc.type !== 'person';
                });
                rows = _.sortBy(rows, function(row) {
                    return titleFor(row.doc);
                });
                _.forEach(rows, function(row) {
                    var val = row.id;
                    var selected = row.id === initialValue? 'selected' : '';
                    selecter.append('<option value="' + val + '" ' + selected + '>' + titleFor(row.doc) + '</option>');
                });
            });
    };

    Facilitywidget.prototype.destroy = function( /* element */ ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new Facilitywidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': 'input[data-type-xml=facility]',
    };
} );


