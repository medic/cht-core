'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const APPEARANCES = {
  widget: '.or-appearance-barcode-scanner',
  input: '.or-appearance-barcode-input',
};

/**
 * Barcode scanner
 * @extends Widget
 */
class Barcodescannerwidget extends Widget {
  static get selector() {
    return APPEARANCES.widget;
  }

  _init() {
    const $widget = $(this.element);

    if (!window.CHTCore.BarcodeScanner.isEnabled()) {
      window.CHTCore.Translate
        .get('barcode_scanner.message.disable')
        .then(label => $widget.append(`<label>${label}</label>`));
      return;
    }

    window.CHTCore.Translate
      .get('barcode_scanner.label.scan')
      .then(label => {
        $widget.append(
          `<div class="barcode-scanner-actions"><a class="btn btn-primary scan-barcode">${label}</a></div>`
        );

        $widget.on('click', '.btn.scan-barcode', () => this.scanBarcode($widget));
      });
  }

  scanBarcode() {
    window.CHTCore.BarcodeScanner
      .scanBarcode()
      .then(code => {
        $(APPEARANCES.input)
          .val(code)
          .trigger('change');
      });
  }
}

module.exports = Barcodescannerwidget;
