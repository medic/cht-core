import { Inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { DOCUMENT } from '@angular/common';

import { TelemetryService } from '@mm-services/telemetry.service';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { TranslateService } from '@mm-services/translate.service';
import { GlobalActions } from '@mm-actions/global';

@Injectable({
  providedIn: 'root'
})
export class BarcodeScannerService {
  private readonly windowRef;
  private readonly TELEMETRY_PREFIX = 'barcode_scanner';
  private readonly globalAction: GlobalActions;

  constructor(
    private readonly store: Store,
    private readonly browserDetectorService: BrowserDetectorService,
    private readonly telemetryService: TelemetryService,
    private readonly translateService: TranslateService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.windowRef = this.document.defaultView;
    this.globalAction = new GlobalActions(this.store);
  }

  async canScanBarcodes() {
    const barcodeTypes = await this.getSupportedBarcodeFormats();

    if (
      !('BarcodeDetector' in this.windowRef)
      || !barcodeTypes?.length
      || this.browserDetectorService.isDesktopUserAgent() // CHT won't support it in desktop's browser.
    ) {
      const message = 'Barcode Detector API is not supported in this browser.';
      console.error(message);
      await this.telemetryService.record(`${this.TELEMETRY_PREFIX}:not_supported`);
      return false;
    }

    return true;
  }

  async getSupportedBarcodeFormats() {
    const barcodeTypes = await this.windowRef.BarcodeDetector?.getSupportedFormats();
    console.info(`Supported barcode formats: ${barcodeTypes?.join(', ')}`);
    return barcodeTypes;
  }

  async initBarcodeScanner(onScanCallback) {
    const canScanBarcodes = await this.canScanBarcodes();
    if (!canScanBarcodes) {
      return;
    }

    const barcodeTypes = await this.getSupportedBarcodeFormats();
    const barcodeDetector = new this.windowRef.BarcodeDetector({ formats: barcodeTypes });

    const barcodeImageElement = this.windowRef.document.createElement('img');
    barcodeImageElement?.addEventListener('load', () => {
      this.scanBarcode(barcodeDetector, barcodeImageElement, onScanCallback);
    });

    return barcodeImageElement;
  }

  private async scanBarcode(barcodeDetector, imageHolder, onScanCallback) {
    const errorMessageKey = 'barcode_scanner.error.cannot_read_barcode';
    await this.telemetryService.record(`${this.TELEMETRY_PREFIX}:scan`);

    try {
      const barcodes = await barcodeDetector.detect(imageHolder);
      if (barcodes.length) {
        onScanCallback(barcodes);
        return;
      }

      const message = this.translateService.instant(errorMessageKey);
      this.globalAction.setSnackbarContent(message);
      await this.telemetryService.record(`${this.TELEMETRY_PREFIX}:barcode_not_detected`);

    } catch (error) {
      const message = this.translateService.instant(errorMessageKey);
      this.globalAction.setSnackbarContent(message);
      console.error(message, error);
      await this.telemetryService.record(`${this.TELEMETRY_PREFIX}:failure`);
    }
  }

  processBarcodeFile(input, barcodeImageElement) {
    if (!input.files) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', event => barcodeImageElement.src = event?.target?.result);
    reader.readAsDataURL(input.files[0]);
    input.value = '';
  }
}
