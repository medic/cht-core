
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { CAN_USE_BARCODE_SCANNER, SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { BarcodeScannerService } from '@mm-services/barcode-scanner.service';

describe('Search Bar Component', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let store: MockStore;
  let responsiveService;
  let searchFiltersService;
  let authService;
  let sessionService;
  let telemetryService;
  let barcodeScannerService;

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
    telemetryService = { record: sinon.stub() };
    barcodeScannerService = {
      initBarcodeScanner: sinon.stub(),
      processBarcodeFile: sinon.stub(),
      canScanBarcodes: sinon.stub(),
    };

    await TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          FormsModule
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
          { provide: TelemetryService, useValue: telemetryService },
          { provide: BarcodeScannerService, useValue: barcodeScannerService },
        ]
      })
      .compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    fixture.detectChanges();
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
    const freeTextClearSpy = sinon.spy(component.freetextFilter!, 'clear');

    component.clear();

    expect(freeTextClearSpy.calledOnce).to.be.true;
    expect(freeTextClearSpy.args[0]).to.deep.equal([ true ]);
    expect(component.openSearch).to.be.false;
  });

  it('should do nothing if component is disabled', () => {
    const freeTextClearSpy = sinon.spy(component.freetextFilter!, 'clear');
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
      barcodeScannerService.canScanBarcodes.resolves(true);
      component.showBarcodeScanner = true;
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(component.isBarcodeScannerAvailable).to.be.true;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
      expect(barcodeScannerService.canScanBarcodes.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0]).to.have.members([ CAN_USE_BARCODE_SCANNER ]);
    });

    it('should return false if barcode scanner is configured to not show', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      barcodeScannerService.canScanBarcodes.resolves(true);
      component.showBarcodeScanner = false;
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(barcodeScannerService.canScanBarcodes.notCalled).to.be.true;
      expect(sessionService.isAdmin.notCalled).to.be.true;
      expect(authService.has.notCalled).to.be.true;
    });

    it('should return false if user does not have permission', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(false);
      barcodeScannerService.canScanBarcodes.resolves(true);
      component.showBarcodeScanner = true;
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(barcodeScannerService.canScanBarcodes.notCalled).to.be.true;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0]).to.have.members([ CAN_USE_BARCODE_SCANNER ]);
    });

    it('should return false if user is admin', async () => {
      sessionService.isAdmin.returns(true);
      authService.has.resolves(true);
      barcodeScannerService.canScanBarcodes.resolves(true);
      component.showBarcodeScanner = true;
      sinon.resetHistory();

      await component.ngAfterViewInit();

      expect(barcodeScannerService.canScanBarcodes.notCalled).to.be.true;
      expect(component.isBarcodeScannerAvailable).to.be.false;
      expect(sessionService.isAdmin.calledOnce).to.be.true;
    });

    it('should return false if BarcodeDetector is not supported', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      barcodeScannerService.canScanBarcodes.resolves(false);
      sinon.resetHistory();
      component.showBarcodeScanner = true;

      await component.ngAfterViewInit();

      expect(barcodeScannerService.canScanBarcodes.calledOnce).to.be.true;
      expect(component.isBarcodeScannerAvailable).to.be.false;
    });
  });

  describe('Scan barcodes', () => {
    it('should scan barcode and trigger search', fakeAsync(async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      barcodeScannerService.canScanBarcodes.resolves(true);
      barcodeScannerService.initBarcodeScanner.resolves();
      component.showBarcodeScanner = true;
      sinon.resetHistory();

      await component.ngAfterViewInit();

      const callback = barcodeScannerService.initBarcodeScanner.args[0][0];
      callback([{ rawValue: '1234' }]);
      flush();

      expect(telemetryService.record.calledWith('search_by_barcode:trigger_search')).to.be.true;
      expect(searchFiltersService.freetextSearch.calledWith('1234')).to.be.true;
    }));

    it('should not trigger search if no barcodes', fakeAsync(async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      barcodeScannerService.canScanBarcodes.resolves(true);
      barcodeScannerService.initBarcodeScanner.resolves();
      component.showBarcodeScanner = true;
      sinon.resetHistory();

      await component.ngAfterViewInit();

      const callback = barcodeScannerService.initBarcodeScanner.args[0][0];
      callback([]);
      flush();

      expect(telemetryService.record.notCalled).to.be.true;
      expect(searchFiltersService.freetextSearch.notCalled).to.be.true;
    }));

    it('should record telemetry when barcode is clicked.', fakeAsync(async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(true);
      barcodeScannerService.canScanBarcodes.resolves(true);
      component.showBarcodeScanner = true;
      sinon.resetHistory();

      component.onBarcodeOpen();
      flush();

      expect(telemetryService.record.calledWith('search_by_barcode:open')).to.be.true;
    }));
  });
});
