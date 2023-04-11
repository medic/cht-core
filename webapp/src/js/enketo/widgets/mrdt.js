'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require('enketo-core/src/js/plugins');

const mainSelector = '.or-appearance-mrdt-verify';

/**
   * @extends Widget
   */
class Mrdtwidget extends Widget {
  static get selector() {
    return `${mainSelector} input`;
  }

  _init() {
    const $el = $( this.element ).parent( mainSelector );
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
      $translate.get( 'mrdt.disabled' ).then((label) => {
        $el.append( '<p>' + label + '</p>' );
      });
      return;
    }

    $el.on( 'click', '.btn.mrdt-verify', function() {
      MRDT.verify().then((data = {}) => {
        const image = data.image;
        const timeTaken = data.timeTaken;
        $el
          .find( 'textarea' )
          .val( image )
          .trigger( 'change' );
        $el
          .find( '.mrdt-preview' )
          .attr('src', 'data:image/png;base64, ' + image);
        if (timeTaken) {
          $el
            .siblings( '.or-appearance-mrdt-time-taken' )
            .find( 'input' )
            .val( timeTaken )
            .trigger( 'change' );
        }
      } );
    } );

    $translate.get( 'mrdt.verify' ).then((label) => {
      $el.append(
        '<div><a class="btn btn-default mrdt-verify">' + label + '</a></div>' +
        '<div><img class="mrdt-preview"/></div>'
      );
    } );
  }
}

module.exports = Mrdtwidget;
