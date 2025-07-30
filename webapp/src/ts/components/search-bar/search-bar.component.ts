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

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';

import { SortFilterComponent } from '@mm-components/filters/sort-filter/sort-filter.component';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-search-bar',
  templateUrl: './search-bar.component.html',
  imports: [FreetextFilterComponent, SortFilterComponent, MatIcon, TranslatePipe]
})
export class SearchBarComponent implements AfterContentInit, AfterViewInit, OnDestroy {
  @Input() disabled;
  @Input() showFilter;
  @Input() showSort;
  @Input() sortDirection;
  @Input() lastVisitedDateExtras;
  @Output() sort: EventEmitter<any> = new EventEmitter();
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();

  private filters;
  private globalActions;
  subscription: Subscription = new Subscription();
  activeFilters: number = 0;
  openSearch = false;

  @ViewChild(FreetextFilterComponent) freetextFilter?: FreetextFilterComponent;

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
    private searchFiltersService: SearchFiltersService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterContentInit() {
    this.subscribeToStore();
  }

  ngAfterViewInit() {
    this.searchFiltersService.init(this.freetextFilter);
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getSidebarFilter),
      this.store.select(Selectors.getFilters),
      this.store.select(Selectors.getSearchBar),
    ).subscribe(([sidebarFilter, filters, searchBar]) => {
      this.activeFilters = sidebarFilter?.filterCount?.total || 0;
      this.filters = filters;
      this.openSearch = !!searchBar?.isOpen;

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
    this.freetextFilter?.clear(true);
    this.toggleMobileSearch(false);
  }

  toggleMobileSearch(forcedValue?) {
    if (forcedValue === undefined && (this.disabled || !this.responsiveService.isMobile())) {
      return;
    }

    const isSearchOpen = forcedValue !== undefined ? forcedValue : !this.openSearch;
    this.globalActions.setSearchBar({ isOpen: isSearchOpen });

    if (isSearchOpen) {
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

  ngOnDestroy() {
    this.clear();
    this.subscription.unsubscribe();
  }
}
