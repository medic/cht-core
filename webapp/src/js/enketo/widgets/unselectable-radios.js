if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
  var define = function( factory ) { // eslint-disable-line
    factory( require, exports, module );
  };
}
/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( function( require, exports, module ) {
  'use strict';
  const Widget = require( 'enketo-core/src/js/Widget' );
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
    Widget.call( this, element, options );
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

  module.exports = {
    'name': pluginName,
    // Enketo currently uses `data-required` instead of `required` to denote
    // a required field.
    //
    // This code assumes that we never have dynamicly calculated required
    // flags.  See https://github.com/enketo/enketo-core/issues/362 for more
    // discussion.
    'selector': 'input[type=radio][data-required="true()"]'
  };
} );
