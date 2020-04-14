'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

const pluginName = 'unselectableradios';

/**
 * Prevent required radio buttons from being unchecked.
 *
 * @constructor
 * @param {Element} element [description]
 * @param {(boolean|{touch: boolean, repeat: boolean})} options options
 * @param {*=} e     event
 */
function Unselectableradios( element, options ) {
  this.namespace = pluginName;
  Object.assign( this, new Widget( element, options ) );
  this._init();
}

//copy the prototype functions from the Widget super class
Unselectableradios.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
Unselectableradios.prototype.constructor = Unselectableradios;

Unselectableradios.prototype._init = function() {
  $( this.element ).addClass( 'no-unselect' );
};

Unselectableradios.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

$.fn[ pluginName ] = function( options, event ) {
  return this.each( function() {
    const $this = $( this );
    let data = $this.data( pluginName );

    options = options || {};

    if ( !data && typeof options === 'object' ) {
      $this.data( pluginName, ( data = new Unselectableradios( this, options, event ) ) );
    } else if ( data && typeof options === 'string' ) {
      data[ options ]( this );
    }
  } );
};

// Enketo currently uses `data-required` instead of `required` to denote
// a required field.
//
// This code assumes that we never have dynamicly calculated required
// flags.  See https://github.com/enketo/enketo-core/issues/362 for more
// discussion.
Unselectableradios.selector = 'input[type=radio][data-required="true()"]';
Unselectableradios.condition = Widget.condition;

module.exports = Unselectableradios;
