import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  AfterContentInit,
  AfterViewInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { BarcodeScannerService } from '@mm-services/barcode-scanner.service';

export const CAN_USE_BARCODE_SCANNER = 'can_search_with_barcode_scanner';

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
  private filters;
  private barcodeImageElement;
  subscription: Subscription = new Subscription();
  activeFilters: number = 0;
  openSearch = false;
  isBarcodeScannerAvailable = false;

  @ViewChild(FreetextFilterComponent) freetextFilter?: FreetextFilterComponent;

  constructor(
    private readonly store: Store,
    private readonly responsiveService: ResponsiveService,
    private readonly searchFiltersService: SearchFiltersService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly telemetryService: TelemetryService,
    private readonly barcodeScannerService: BarcodeScannerService,
  ) {}

  ngAfterContentInit() {
    this.subscribeToStore();
  }

  async ngAfterViewInit() {
    this.isBarcodeScannerAvailable = await this.canShowBarcodeScanner();
    this.searchFiltersService.init(this.freetextFilter);
    this.barcodeImageElement = await this.barcodeScannerService.initBarcodeScanner(codes => this.scanBarcode(codes));
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

  onBarcodeOpen() {
    this.telemetryService.record(`${this.TELEMETRY_PREFIX}:open`);
  }

  processBarcodeFile($event) {
    this.barcodeScannerService.processBarcodeFile($event.target, this.barcodeImageElement);
  }

  async clear() {
    if (this.disabled) {
      return;
    }
    this.freetextFilter?.clear(true);
    this.toggleMobileSearch(false);
    this.barcodeImageElement = await this.barcodeScannerService.initBarcodeScanner(codes => this.scanBarcode(codes));
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

    return await this.barcodeScannerService.canScanBarcodes();
  }

  private async scanBarcode(barcodes) {
    if (!barcodes.length) {
      return;
    }

    this.searchFiltersService.freetextSearch(barcodes[0].rawValue);
    await this.telemetryService.record(`${this.TELEMETRY_PREFIX}:trigger_search`);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
