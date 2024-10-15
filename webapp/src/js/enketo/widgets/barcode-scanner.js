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

  async _init() {
    const $widget = $(this.element);

    const canScanBarcodes = await window.CHTCore.BarcodeScanner.canScanBarcodes();
    if (!canScanBarcodes) {
      window.CHTCore.Translate
        .get('barcode_scanner.message.disable')
        .then(label => $widget.append(`<label>${label}</label>`));
      return;
    }

    const barcodeImageElement = await window.CHTCore.BarcodeScanner.initBarcodeScanner(barcodes => {
      if (!barcodes || !barcodes.length) {
        return;
      }
      $(`${APPEARANCES.input} input[type="text"]`)
        .val(barcodes[0].rawValue)
        .trigger('change');
    });

    $widget.append(
      `<label class="scan-barcode fa fa-qrcode">
         <input type="file" name="barcode-file" class="barcode-scanner-file" data-type-xml="binary" accept="image/*"/>
      </label>`
    );

    $widget.on(
      'change',
      '.barcode-scanner-file',
      event => window.CHTCore.BarcodeScanner.processBarcodeFile(event.target, barcodeImageElement)
    );
  }
}

module.exports = Barcodescannerwidget;
