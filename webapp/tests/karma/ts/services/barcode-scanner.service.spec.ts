import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';

import { GlobalActions } from '@mm-actions/global';
import { TranslateService } from '@mm-services/translate.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { BarcodeScannerService } from '@mm-services/barcode-scanner.service';

class BarcodeDetector {
  constructor() {}
  static getSupportedFormats() {}
  detect() {}
}

describe('BarcodeScannerService', () => {
  let service;
  let translateService;
  let telemetryService;
  let documentRef;
  let getSupportedFormatsStub;
  let detectStub;
  let browserDetectorService;

  beforeEach(() => {
    translateService = { instant: sinon.stub() };
    telemetryService = { record: sinon.stub() };
    browserDetectorService = { isDesktopUserAgent: sinon.stub() };

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        provideMockStore({}),
        { provide: TranslateService, useValue: translateService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: BrowserDetectorService, useValue: browserDetectorService },
      ],
    });

    service = TestBed.inject(BarcodeScannerService);
    documentRef = TestBed.inject(DOCUMENT);
    service.windowRef = {
      ...service.windowRef,
      BarcodeDetector
    };
    getSupportedFormatsStub = sinon.stub(BarcodeDetector, 'getSupportedFormats').resolves([]);
    detectStub = sinon.stub(BarcodeDetector.prototype, 'detect');
  });

  afterEach(() => sinon.restore());

  describe('Barcode scanner support', () => {
    it('should return true if BarcodeDetector is supported', async () => {
      browserDetectorService.isDesktopUserAgent.returns(false);
      getSupportedFormatsStub.resolves([ 'code_39', 'aztec' ]);

      const result = await service.canScanBarcodes();

      expect(result).to.be.true;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.true;
    });

    it('should return false if browser is desktop', async () => {
      browserDetectorService.isDesktopUserAgent.returns(true);
      getSupportedFormatsStub.resolves([ 'code_39', 'aztec' ]);
      sinon.resetHistory();

      const result = await service.canScanBarcodes();

      expect(result).to.be.false;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.true;
      expect(telemetryService.record.calledWith('barcode_scanner:not_supported')).to.be.true;
    });

    it('should return false if BarcodeDetector is not supported in "window"', async () => {
      service.windowRef = {};
      browserDetectorService.isDesktopUserAgent.returns(false);
      getSupportedFormatsStub.resolves([ 'code_39', 'aztec' ]);
      sinon.resetHistory();

      const result = await service.canScanBarcodes();

      expect(result).to.be.false;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.false;
      expect(telemetryService.record.calledWith('barcode_scanner:not_supported')).to.be.true;
    });

    it('should return false if browser does not support any type of barcode', async () => {
      browserDetectorService.isDesktopUserAgent.returns(false);
      getSupportedFormatsStub.resolves([]);

      const result = await service.canScanBarcodes();

      expect(result).to.be.false;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.false;
      expect(telemetryService.record.calledWith('barcode_scanner:not_supported')).to.be.true;
    });
  });

  describe('Scan barcodes', () => {
    it('should scan barcode', fakeAsync(async () => {
      const imageHolder = { addEventListener: sinon.stub() };
      getSupportedFormatsStub.resolves([ 'code_39', 'aztec' ]);
      const createElementStub = sinon.stub(documentRef.defaultView.document, 'createElement');
      createElementStub.returns(imageHolder);
      detectStub.resolves([{ rawValue: '1234' }]);
      const callback = sinon.stub();

      const image = await service.initBarcodeScanner(callback);

      expect(image).to.be.not.undefined;
      expect(getSupportedFormatsStub.calledTwice).to.be.true;
      expect(imageHolder.addEventListener.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.args[0][0]).to.equal('load');

      const eventCallback = imageHolder.addEventListener.args[0][1];
      eventCallback();
      flush();

      expect(telemetryService.record.calledWith('barcode_scanner:scan')).to.be.true;
      expect(detectStub.calledWith(imageHolder)).to.be.true;
      expect(callback.calledOnce).to.be.true;
      expect(callback.args[0][0]).to.have.deep.members([{ rawValue: '1234' }]);
    }));

    it('should advice to retry if barcode was not detected', fakeAsync(async () => {
      translateService.instant.returns('please retry');
      getSupportedFormatsStub.resolves([ 'code_39', 'aztec' ]);
      const setSnackbarContentSpy = sinon.spy(GlobalActions.prototype, 'setSnackbarContent');
      const imageHolder = { addEventListener: sinon.stub() };
      const createElementStub = sinon.stub(documentRef.defaultView.document, 'createElement');
      createElementStub.returns(imageHolder);
      detectStub.resolves([]);
      sinon.resetHistory();
      const callback = sinon.stub();

      const image = await service.initBarcodeScanner(callback);

      expect(image).to.be.not.undefined;
      expect(getSupportedFormatsStub.calledTwice).to.be.true;
      expect(imageHolder.addEventListener.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.args[0][0]).to.equal('load');

      const eventCallback = imageHolder.addEventListener.args[0][1];
      eventCallback();
      flush();

      expect(telemetryService.record.calledWith('barcode_scanner:scan')).to.be.true;
      expect(telemetryService.record.calledWith('barcode_scanner:barcode_not_detected')).to.be.true;
      expect(detectStub.calledWith(imageHolder)).to.be.true;
      expect(translateService.instant.calledWith('barcode_scanner.error.cannot_read_barcode')).to.be.true;
      expect(setSnackbarContentSpy.calledWith('please retry')).to.be.true;
      expect(callback.notCalled).to.be.true;
    }));

    it('should catch exceptions', fakeAsync(async () => {
      translateService.instant.returns('some nice text');
      getSupportedFormatsStub.resolves([ 'code_39', 'aztec' ]);
      const setSnackbarContentSpy = sinon.spy(GlobalActions.prototype, 'setSnackbarContent');
      const imageHolder = { addEventListener: sinon.stub() };
      const createElementStub = sinon.stub(documentRef.defaultView.document, 'createElement');
      createElementStub.returns(imageHolder);
      detectStub.rejects('some error');
      sinon.resetHistory();
      const callback = sinon.stub();

      const image = await service.initBarcodeScanner(callback);

      expect(image).to.be.not.undefined;
      expect(getSupportedFormatsStub.calledTwice).to.be.true;
      expect(imageHolder.addEventListener.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.args[0][0]).to.equal('load');

      const eventCallback = imageHolder.addEventListener.args[0][1];
      eventCallback();
      flush();

      expect(telemetryService.record.calledWith('barcode_scanner:scan')).to.be.true;
      expect(detectStub.calledWith(imageHolder)).to.be.true;
      expect(translateService.instant.calledWith('barcode_scanner.error.cannot_read_barcode')).to.be.true;
      expect(setSnackbarContentSpy.calledWith('some nice text')).to.be.true;
      expect(callback.notCalled).to.be.true;
      expect(telemetryService.record.calledWith('barcode_scanner:failure')).to.be.true;
    }));
  });
});
