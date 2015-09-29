if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';
    var Widget = require( 'enketo-core/src/js/Widget' );
    var $ = require( 'jquery' );
    var placeSelectFormat = require('../../modules/format').clinic;
    require( 'enketo-core/src/js/plugins' );

    var pluginName = 'medicplacewidget';

    /**
     * Allows drop-down selecters for places.
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
        textInput.attr('type', 'hidden');

        var loader = $('<div class="loader"/></div>');
        textInput.after(loader);

        var titleFor = function(doc) {
            var titleString = ContactSchema.get(doc.type).title;
            return titleString.replace(/\{\{[^}]*\}\}/g, function(m) {
                return doc[m.substring(2, m.length-2)];
            });
        };

        var formatResult = function(row) {
            if(row.doc) {
                return placeSelectFormat(row.doc);
            }
            return translate('contact.type.' + row.text);
        };

        var placeTypes = _.map(_.without(Object.keys(ContactSchema.get()), 'person'), function(type) {
            return [ type ];
        });

        var flatPlaceTypes = _.flatten(placeTypes);

        DB.query('medic/doc_by_type', { include_docs: true, keys: placeTypes })
            .then(function(res) {
                loader.remove();

                var groups = _.chain(res.rows)
                        .groupBy(function(row) {
                            return row.doc.type;
                        })
                        .collect(function(children, type) {
                            children.sort(function(a, b) {
                                return titleFor(a.doc) < titleFor(b.doc) ? -1 : 1;
                            });
                            return { text: type, children: children, id: type };
                        })
                        .value();

                textInput.select2({
                    data: groups,
                    formatResult: formatResult,
                    formatSelection: formatResult,
                    width: '100%',
                });
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


