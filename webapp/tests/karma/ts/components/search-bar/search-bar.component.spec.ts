import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { DOCUMENT } from '@angular/common';

import { CAN_USE_BARCODE_SCANNER, SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { TranslateService } from '@mm-services/translate.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { FeedbackService } from '@mm-services/feedback.service';

class BarcodeDetector {
  constructor() {}
  static getSupportedFormats() {}
  detect() {}
}

describe('Search Bar Component', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let store: MockStore;
  let responsiveService;
  let searchFiltersService;
  let authService;
  let sessionService;
  let translateService;
  let telemetryService;
  let documentRef;
  let getSupportedFormatsStub;
  let detectStub;
  let browserDetectorService;
  let feedbackService;

  beforeEach(async () => {
    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: { filterCount: { total: 5 } } },
      { selector: Selectors.getFilters, value: undefined },
    ];
    searchFiltersService = {
      init: sinon.stub(),
      freetextSearch: sinon.stub(),
    };
    responsiveService = { isMobile: sinon.stub() };
    authService = { has: sinon.stub() };
    sessionService = { isAdmin: sinon.stub() };
    translateService = { instant: sinon.stub() };
    telemetryService = { record: sinon.stub() };
    browserDetectorService = { isDesktopUserAgent: sinon.stub() };
    feedbackService = { submit: sinon.stub() };

    await TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          SearchBarComponent,
          FreetextFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: SearchFiltersService, useValue: searchFiltersService },
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: TranslateService, useValue: translateService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: BrowserDetectorService, useValue: browserDetectorService },
          { provide: FeedbackService, useValue: feedbackService },
        ]
      })
      .compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    documentRef = TestBed.inject(DOCUMENT);
    fixture.detectChanges();

    component.windowRef = {
      ...component.windowRef,
      BarcodeDetector
    };
    getSupportedFormatsStub = sinon.stub(BarcodeDetector, 'getSupportedFormats').resolves([]);
    detectStub = sinon.stub(BarcodeDetector.prototype, 'detect');
  });

  afterEach(() => sinon.restore());

  it('should create component', fakeAsync(() => {
    flush();
    expect(component).to.exist;
    expect(component.activeFilters).to.equal(5);
  }));

  it('should init search filter service', fakeAsync(() => {
    sinon.resetHistory();

    component.ngAfterViewInit();
    flush();

    expect(searchFiltersService.init.calledOnce).to.be.true;
  }));

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.callCount).to.equal(1);
  });

  it('should clear search term and apply', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');

    component.clear();

    expect(freeTextClearSpy.calledOnce).to.be.true;
    expect(freeTextClearSpy.args[0]).to.deep.equal([ true ]);
    expect(component.openSearch).to.be.false;
  });

  it('should do nothing if component is disabled', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter, 'clear');
    component.disabled = true;

    component.clear();

    expect(freeTextClearSpy.notCalled).to.be.true;
  });

  it('should toggle search', () => {
    responsiveService.isMobile.returns(true);
    component.toggleMobileSearch();
    expect(component.openSearch).to.be.true;
    component.toggleMobileSearch();
    expect(component.openSearch).to.be.false;

    responsiveService.isMobile.returns(false);
    component.toggleMobileSearch();
    expect(component.openSearch).to.be.false;

    component.toggleMobileSearch(true);
    expect(component.openSearch).to.be.true;
  });

  it('should show search icon when searchbar is close and no search terms', fakeAsync(() => {
    store.overrideSelector(Selectors.getFilters, { search: 'some text' });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showSearchIcon()).to.be.false;

    component.openSearch = false;
    tick();
    expect(component.showSearchIcon()).to.be.false;

    store.overrideSelector(Selectors.getFilters, { search: null });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showSearchIcon()).to.be.false;

    component.openSearch = false;
    tick();
    expect(component.showSearchIcon()).to.be.true;
  }));

  it('should show clear icon when searchbar is open or there are search terms', fakeAsync(() => {
    store.overrideSelector(Selectors.getFilters, { search: 'some text' });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showClearIcon()).to.be.true;

    component.openSearch = false;
    tick();
    expect(component.showClearIcon()).to.be.true;

    store.overrideSelector(Selectors.getFilters, { search: null });
    store.refreshState();

    component.openSearch = true;
    tick();
    expect(component.showClearIcon()).to.be.true;

    component.openSearch = false;
    tick();
    expect(component.showClearIcon()).to.be.false;
  }));

  describe('Barcode scanner support', () => {
    it('should return true if BarcodeDetector is supported, user has permission and is not admin', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      browserDetectorService.isDesktopUserAgent.returns(false);
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(component.isBarcodeScannerAvailable).to.be.true;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0]).to.have.members([ CAN_USE_BARCODE_SCANNER ]);
    });

    it('should return false if browser is desktop', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      browserDetectorService.isDesktopUserAgent.returns(true);
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0]).to.have.members([ CAN_USE_BARCODE_SCANNER ]);
      expect(feedbackService.submit.calledWith('Barcode Detector API is not supported in this browser.')).to.be.true;
      expect(telemetryService.record.calledWith('search_by_barcode:not_supported'));
    });

    it('should return false if user does not have permission', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(false);
      browserDetectorService.isDesktopUserAgent.returns(false);
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(browserDetectorService.isDesktopUserAgent.called).to.be.false;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0]).to.have.members([ CAN_USE_BARCODE_SCANNER ]);
    });

    it('should return false if user is admin', async () => {
      sessionService.isAdmin.returns(true);
      authService.has.resolves(true);
      browserDetectorService.isDesktopUserAgent.returns(false);
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(browserDetectorService.isDesktopUserAgent.called).to.be.false;
      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
    });

    it('should return false if BarcodeDetector is not supported', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      browserDetectorService.isDesktopUserAgent.returns(false);
      sinon.resetHistory();
      component.windowRef = {};

      await component.ngAfterViewInit();

      expect(browserDetectorService.isDesktopUserAgent.called).to.be.false;
      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(feedbackService.submit.calledWith('Barcode Detector API is not supported in this browser.')).to.be.true;
      expect(telemetryService.record.calledWith('search_by_barcode:not_supported'));
    });
  });

  describe('Scan barcodes', () => {
    it('should scan barcode and trigger search', fakeAsync(async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      const imageHolder = { addEventListener: sinon.stub() };
      const createElementStub = sinon.stub(documentRef.defaultView.document, 'createElement');
      createElementStub.returns(imageHolder);
      detectStub.resolves([{ rawValue: '1234' }]);
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(getSupportedFormatsStub.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.args[0][0]).to.equal('load');

      const eventCallback = imageHolder.addEventListener.args[0][1];
      eventCallback();
      flush();

      expect(telemetryService.record.calledWith('search_by_barcode:scan')).to.be.true;
      expect(telemetryService.record.calledWith('search_by_barcode:trigger_search')).to.be.true;
      expect(detectStub.calledWith(imageHolder)).to.be.true;
      expect(searchFiltersService.freetextSearch.calledWith('1234')).to.be.true;
    }));

    it('should advice to retry if barcode was not detected', fakeAsync(async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      translateService.instant.returns('please retry');
      const setSnackbarContentSpy = sinon.spy(GlobalActions.prototype, 'setSnackbarContent');
      const imageHolder = { addEventListener: sinon.stub() };
      const createElementStub = sinon.stub(documentRef.defaultView.document, 'createElement');
      createElementStub.returns(imageHolder);
      detectStub.resolves([]);
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(getSupportedFormatsStub.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.args[0][0]).to.equal('load');

      const eventCallback = imageHolder.addEventListener.args[0][1];
      eventCallback();
      flush();

      expect(telemetryService.record.calledWith('search_by_barcode:scan')).to.be.true;
      expect(telemetryService.record.calledWith('search_by_barcode:barcode_not_detected')).to.be.true;
      expect(detectStub.calledWith(imageHolder)).to.be.true;
      expect(translateService.instant.calledWith('barcode_scanner.error.cannot_read_barcode')).to.be.true;
      expect(setSnackbarContentSpy.calledWith('please retry')).to.be.true;
      expect(searchFiltersService.freetextSearch.notCalled).to.be.true;
    }));

    it('should catch exceptions', fakeAsync(async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      translateService.instant.returns('some nice text');
      const setSnackbarContentSpy = sinon.spy(GlobalActions.prototype, 'setSnackbarContent');
      const imageHolder = { addEventListener: sinon.stub() };
      const createElementStub = sinon.stub(documentRef.defaultView.document, 'createElement');
      createElementStub.returns(imageHolder);
      detectStub.rejects('some error');
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(getSupportedFormatsStub.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.calledOnce).to.be.true;
      expect(imageHolder.addEventListener.args[0][0]).to.equal('load');

      const eventCallback = imageHolder.addEventListener.args[0][1];
      eventCallback();
      flush();

      expect(telemetryService.record.calledWith('search_by_barcode:scan')).to.be.true;
      expect(detectStub.calledWith(imageHolder)).to.be.true;
      expect(translateService.instant.calledWith('barcode_scanner.error.cannot_read_barcode')).to.be.true;
      expect(setSnackbarContentSpy.calledWith('some nice text')).to.be.true;
      expect(searchFiltersService.freetextSearch.notCalled).to.be.true;
      expect(feedbackService.submit.calledWith('some nice text')).to.be.true;
      expect(telemetryService.record.calledWith('search_by_barcode:failure'));
    }));
  });
});
