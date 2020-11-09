{
  'use strict';
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require( 'jquery' );
  require('enketo-core/src/js/plugins');

  const pluginName = 'mrdtwidget';

  /**
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, repeat: boolean})} options options
     * @param {*=} e     event
     */
  function Mrdtwidget( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
  }

  //copy the prototype functions from the Widget super class
  Mrdtwidget.prototype = Object.create( Widget.prototype );

  //ensure the constructor is the new one
  Mrdtwidget.prototype.constructor = Mrdtwidget;

  Mrdtwidget.prototype._init = function() {
    const self = this;
    const $el = $( this.element );
    const $input = $el.find( 'input' );

    // we need to make it a textarea because text inputs strip out the
    // \n (new line) characters which breaks the encoded file content.
    const textarea = $input[0].outerHTML
      .replace(/^<input /, '<textarea ')
      .replace(/<\/input>/, '</textarea>');
    $input.replaceWith(textarea);
    const $translate = window.CHTCore.Translate;
    const MRDT = window.CHTCore.MRDT;

    if ( !MRDT.enabled() ) {
      $translate.get( 'mrdt.disabled' ).toPromise().then((label) => {
        $el.append( '<p>' + label + '</p>' );
      });
      return;
    }

    $el.on( 'click', '.btn.mrdt-verify', function() {
      MRDT.verify().then((data = {}) => {
        const image = data.image;
        const timeTaken = data.timeTaken;
        $( self.element )
          .find( 'textarea' )
          .val( image )
          .trigger( 'change' );
        $( self.element )
          .find( '.mrdt-preview' )
          .attr('src', 'data:image/png;base64, ' + image);
        if (timeTaken) {
          $( self.element )
            .siblings( '.or-appearance-mrdt-time-taken' )
            .find( 'input' )
            .val( timeTaken )
            .trigger( 'change' );
        }
      } );
    } );

    $translate.get( 'mrdt.verify' ).toPromise().then((label) => {
      $el.append(
        '<div><a class="btn btn-default mrdt-verify">' + label + '</a></div>' +
                '<div><img class="mrdt-preview"/></div>'
      );
    } );
  };

  Mrdtwidget.prototype.destroy = function( element ) {};  // eslint-disable-line no-unused-vars

  $.fn[ pluginName ] = function( options, event ) {
    return this.each( function() {
      const $this = $( this );
      let data = $this.data( pluginName );

      options = options || {};

      if ( !data && typeof options === 'object' ) {
        $this.data( pluginName, ( data = new Mrdtwidget( this, options, event ) ) );
      } else if ( data && typeof options === 'string' ) {
        data[ options ]( this );
      }
    } );
  };

  module.exports = {
    'name': pluginName,
    'selector': '.or-appearance-mrdt-verify',
  };
}
