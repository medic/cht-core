import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  AfterContentInit,
  AfterViewInit,
  Output,
  ViewChild,
  Inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { DOCUMENT } from '@angular/common';

import { Selectors } from '@mm-selectors/index';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { GlobalActions } from '@mm-actions/global';
import { TranslateService } from '@mm-services/translate.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { FeedbackService } from '@mm-services/feedback.service';

export const CAN_USE_BARCODE_SCANNER = 'can_use_barcode_scanner';

@Component({
  selector: 'mm-search-bar',
  templateUrl: './search-bar.component.html'
})
export class SearchBarComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input() disabled;
  @Input() showFilter;
  @Input() showSort;
  @Input() showBarcodeScanner;
  @Input() sortDirection;
  @Input() lastVisitedDateExtras;
  @Output() sort: EventEmitter<any> = new EventEmitter();
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();
  @Output() search: EventEmitter<any> = new EventEmitter();

  private readonly TELEMETRY_PREFIX = 'search_by_barcode';
  private globalAction: GlobalActions;
  private barcodeDetector;
  private filters;
  private barcodeTypes;
  private barcodeImageElement;
  windowRef;
  subscription: Subscription = new Subscription();
  activeFilters: number = 0;
  openSearch = false;
  isBarcodeScannerAvailable = false;

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
    private searchFiltersService: SearchFiltersService,
    private authService: AuthService,
    private sessionService: SessionService,
    private translateService: TranslateService,
    private telemetryService: TelemetryService,
    private browserDetectorService: BrowserDetectorService,
    private feedbackService: FeedbackService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.windowRef = this.document.defaultView;
    this.globalAction = new GlobalActions(store);
  }

  ngAfterContentInit() {
    this.subscribeToStore();
  }

  async ngAfterViewInit() {
    this.isBarcodeScannerAvailable = await this.canShowBarcodeScanner();
    this.searchFiltersService.init(this.freetextFilter);
    await this.initBarcodeScanner();
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getSidebarFilter),
      this.store.select(Selectors.getFilters),
    ).subscribe(([sidebarFilter, filters]) => {
      this.activeFilters = sidebarFilter?.filterCount?.total || 0;
      this.filters = filters;

      if (!this.openSearch && this.filters?.search) {
        this.toggleMobileSearch();
      }
    });
    this.subscription.add(subscription);
  }

  private async initBarcodeScanner() {
    if (!this.isBarcodeScannerAvailable) {
      return;
    }

    console.info(`Supported barcode formats: ${this.barcodeTypes?.join(', ')}`);
    this.barcodeDetector = new this.windowRef.BarcodeDetector({ formats: this.barcodeTypes });

    this.barcodeImageElement = this.windowRef.document.createElement('img');
    this.barcodeImageElement?.addEventListener('load', () => this.scanBarcode(this.barcodeImageElement)); // NOSONAR
  }

  onBarcodeOpen() {
    this.telemetryService.record(`${this.TELEMETRY_PREFIX}:open`);
  }

  processBarcodeFile($event) {
    const input = $event.target;
    if (!input.files) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', event => this.barcodeImageElement.src = event?.target?.result);
    reader.readAsDataURL(input.files[0]);
    input.value = '';
  }

  clear() {
    if (this.disabled) {
      return;
    }
    this.freetextFilter.clear(true);
    this.toggleMobileSearch(false);
    this.initBarcodeScanner();
  }

  toggleMobileSearch(forcedValue?) {
    if (forcedValue === undefined && (this.disabled || !this.responsiveService.isMobile())) {
      return;
    }

    this.openSearch = forcedValue !== undefined ? forcedValue : !this.openSearch;

    if (this.openSearch) {
      // To automatically display the mobile's soft keyboard.
      setTimeout(() => $('.mm-search-bar-container #freetext').focus());
    }
  }

  applySort(direction) {
    this.sort.emit(direction);
  }

  showSearchIcon() {
    return !this.openSearch && !this.filters?.search;
  }

  showClearIcon() {
    return this.openSearch || !!this.filters?.search;
  }

  private async canShowBarcodeScanner() {
    if (!this.showBarcodeScanner) {
      return false;
    }

    const canUseBarcodeScanner = !this.sessionService.isAdmin() && await this.authService.has(CAN_USE_BARCODE_SCANNER);
    if (!canUseBarcodeScanner) {
      return false;
    }

    this.barcodeTypes = await this.windowRef.BarcodeDetector?.getSupportedFormats();

    if (
      !('BarcodeDetector' in this.windowRef)
      || !this.barcodeTypes?.length
      || this.browserDetectorService.isDesktopUserAgent() // But we won't support it in desktop's browser.
    ) {
      const message = 'Barcode Detector API is not supported in this browser.';
      console.error(message);
      this.feedbackService.submit(message);
      this.telemetryService.record(`${this.TELEMETRY_PREFIX}:not_supported`);
      return false;
    }

    return true;
  }

  private async scanBarcode(imageHolder) {
    const errorMessageKey = 'barcode_scanner.error.cannot_read_barcode';
    this.telemetryService.record(`${this.TELEMETRY_PREFIX}:scan`);

    try {
      const barcodes = await this.barcodeDetector.detect(imageHolder);
      if (barcodes.length) {
        this.searchFiltersService.freetextSearch(barcodes[0].rawValue);
        this.telemetryService.record(`${this.TELEMETRY_PREFIX}:trigger_search`);
        return;
      }

      const message = this.translateService.instant(errorMessageKey);
      this.globalAction.setSnackbarContent(message);
      this.telemetryService.record(`${this.TELEMETRY_PREFIX}:barcode_not_detected`);

    } catch (error) {
      const message = this.translateService.instant(errorMessageKey);
      this.globalAction.setSnackbarContent(message);
      console.error(message, error);
      this.feedbackService.submit(message);
      this.telemetryService.record(`${this.TELEMETRY_PREFIX}:failure`);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
