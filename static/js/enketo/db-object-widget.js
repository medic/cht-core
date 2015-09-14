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
	var e = $(this.element);

	// TODO extract the ID of the text input field
	// TODO replace the text input with a loader
	// TODO start a DB request to populate the list of whatevers
	var loader = $('<div class="loader"/></div>');
	var textInput = e.find('input');
	var initialValue = textInput.val();
	var container = $('<div ng-controller="DbObjectWidgetCtrl"/>');
	container.append(loader);
	textInput.replaceWith(container);

	/* global PouchDB */
        new PouchDB('http://localhost:5988/medic')
	    // TODO fix the `endkey` value - just adding a `z` is surely not correct
	    // TODO derive `startkey` from `e` - this may require XSLT tweaks!
	    .query('medic/doc_by_type', {include_docs:true, startkey:['person'], endkey:['personz']})
	    .then(function(res) {
		loader.remove();
		var selecter = $('<select/>');
		selecter.attr('name', textInput.attr('name'));
		selecter.attr('data-type-xml', textInput.attr('data-type-xml'));
		container.append(selecter);
		_.forEach(res.rows, function(row) {
		    var val = row.id;
		    var selected = row.id === initialValue? 'selected' : '';
		    selecter.append('<option value="' + val + '" ' + selected + '>' + row.doc.name + '</option>');
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
        'selector': '.or-appearance-dbObject',
    };
} );
