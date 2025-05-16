import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  AfterContentInit,
  AfterViewInit,
  Output,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-filter-slider-icon',
  templateUrl: './filter-slider-icon.component.html',
  imports: [
    TranslatePipe,
  ],
})
export class FilterSliderIconComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input() disabled;
  @Input() showFilter;
  @Input() lastVisitedDateExtras;
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();

  private filters;
  subscription: Subscription = new Subscription();
  activeFilters: number = 0;
  openSearch = false;

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
  ) { }

  ngAfterContentInit() {
    this.subscribeToStore();
  }

  ngAfterViewInit() {
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

  clear() {
    if (this.disabled) {
      return;
    }
    this.toggleMobileSearch(false);
  }

  toggleMobileSearch(forcedValue?) {
    if (forcedValue === undefined && (this.disabled || !this.responsiveService.isMobile())) {
      return;
    }

    this.openSearch = forcedValue !== undefined ? forcedValue : !this.openSearch;
  }

  showSearchIcon() {
    return !this.openSearch && !this.filters?.search;
  }

  showClearIcon() {
    return this.openSearch || !!this.filters?.search;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
