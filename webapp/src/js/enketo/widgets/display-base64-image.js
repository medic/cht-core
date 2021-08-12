{
  'use strict';
  const Widget = require('enketo-core/src/js/Widget');
  const $ = require('jquery');
  require('enketo-core/src/js/plugins');

  const PLUGIN_NAME = 'displaybase64image';
  const APPEARANCE_WIDGET = '.or-appearance-display-base64-image';

  /**
   * Display Base64 Image widget
   * @constructor
   * @param element {Element} The DOM element the widget is applied on.
   * @param options {(Boolean|{touch: Boolean, repeat: Boolean})} Options passed to the widget during instantiation.
   * @param e {*=} Event
   */
  function Displaybase64image(element, options) {
    this.namespace = PLUGIN_NAME;
    Widget.call(this, element, options);
    this._init();
  }

  // Copy the prototype functions from the Widget super class
  Displaybase64image.prototype = Object.create(Widget.prototype);

  // Ensure the constructor is the new one
  Displaybase64image.prototype.constructor = Displaybase64image;

  Displaybase64image.prototype.destroy = function(element) { };  // eslint-disable-line no-unused-vars

  Displaybase64image.prototype._init = function() {
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
      .on('change inputupdate.enketo', () => setSource($img, $input.val()));
  };

  function setSource($img, value) {
    if (!$img || !value) {
      return;
    }

    $img.attr('src', `data:image/png;base64,${value}`);
  }

  $.fn[PLUGIN_NAME] = function (options, event) {
    return this.each(function () {
      const $this = $(this);
      let data = $this.data(PLUGIN_NAME);

      options = options || {};

      if (!data && typeof options === 'object') {
        $this.data(PLUGIN_NAME, (data = new Displaybase64image(this, options, event)));
      } else if (data && typeof options === 'string') {
        data[options](this);
      }
    });
  };

  module.exports = {
    'name': PLUGIN_NAME,
    'selector': APPEARANCE_WIDGET,
    'widget': Displaybase64image
  };
}
