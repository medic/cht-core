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

export const CAN_USE_BARCODE_SCANNER = 'can_use_barcode_scanner';

@Component({
  selector: 'mm-search-bar',
  templateUrl: './search-bar.component.html'
})
export class SearchBarComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input() disabled;
  @Input() showFilter;
  @Input() showSort;
  @Input() sortDirection;
  @Input() lastVisitedDateExtras;
  @Output() sort: EventEmitter<any> = new EventEmitter();
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();
  @Output() search: EventEmitter<any> = new EventEmitter();

  private canUseBarcodeScanner = false;
  private globalAction: GlobalActions;
  private windowRef;
  private barcodeDetector;
  private filters;
  subscription: Subscription = new Subscription();
  activeFilters: number = 0;
  openSearch = false;

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
    private searchFiltersService: SearchFiltersService,
    private authService: AuthService,
    private sessionService: SessionService,
    @Inject(DOCUMENT) private document:Document,
  ) {
    this.windowRef = this.document.defaultView;
    this.globalAction = new GlobalActions(store);
  }

  ngAfterContentInit() {
    this.subscribeToStore();
  }

  async ngAfterViewInit() {
    await this.checkPermissions();
    this.searchFiltersService.init(this.freetextFilter);
    await this.initBarcodeScanner();
  }

  private async checkPermissions() {
    this.canUseBarcodeScanner = !this.sessionService.isAdmin() && await this.authService.has(CAN_USE_BARCODE_SCANNER);
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
    if (!this.isBarcodeScannerAvailable()) {
      return;
    }

    const barcodeTypes = await this.windowRef.BarcodeDetector.getSupportedFormats();
    console.info(`Supported barcode formats: ${barcodeTypes.join(', ')}`);
    this.barcodeDetector = new this.windowRef.BarcodeDetector({ formats: barcodeTypes });

    const imageHolder = this.windowRef.document.createElement('img');
    imageHolder.addEventListener('load', () => this.scanBarcode(imageHolder));

    const input = this.windowRef.document.getElementById('barcode-scanner-input');
    input.addEventListener('change', () => {
      if (!input.files) {
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', event => imageHolder.src = event?.target?.result);
      reader.readAsDataURL(input.files[0]);
      input.value = '';
    });
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

  isBarcodeScannerAvailable() {
    if (!this.canUseBarcodeScanner) {
      return false;
    }

    if (!('BarcodeDetector' in window)) {
      const message = 'Barcode scanner is not supported by this browser.';
      this.globalAction.setSnackbarContent(message);
      console.warn(message);
      return false;
    }

    return true;
  }

  private async scanBarcode(imageHolder) {
    try {
      const barcodes = await this.barcodeDetector.detect(imageHolder);
      barcodes.length && this.searchFiltersService.freetextSearch(barcodes[0].rawValue);
    } catch (error) {
      const message = 'Cannot read barcode';
      this.globalAction.setSnackbarContent(message);
      console.error(message, error);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
