'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const APPEARANCE_WIDGET = '.or-appearance-display-base64-image';

/**
 * Display Base64 Image widget
 * @extends Widget
 */
class Displaybase64image extends Widget {
  static get selector() {
    return APPEARANCE_WIDGET;
  }

  _init() {
    const $widget = $(this.element);
    const $input = $widget.children('input[type=text]');

    if (!$input.length) {
      return;
    }

    let $img = $widget.children('img');

    if (!$img.length) {
      $img = $('<img>');
      $widget.append($img);
    }

    setSource($img, $input.val());
    $input
      .hide()
      .on('change inputupdate', () => setSource($img, $input.val()));
  }
}

function setSource($img, value) {
  const src = value ? `data:image/png;base64,${value}` : '';
  $img.attr('src', src);
}

module.exports = Displaybase64image;
