'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

/**
 * Supports dynamically generated clickable links in the form markdown.
 * https://github.com/medic/cht-core/issues/3349
 */
class DynamicUrlWidget extends Widget {
  static get selector() {
    return 'a.dynamic-url';
  }

  _init() {
    const urlElement = $( this.element ).find('.url');
    $( this.element ).click(() => window.open(urlElement.text(), '_blank'));
  }
}

module.exports = DynamicUrlWidget;
