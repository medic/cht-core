import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  selector: 'mm-search-bar',
  templateUrl: './search-bar.component.html'
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() disabled;
  @Input() showFilter;
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();
  @Output() search: EventEmitter<any> = new EventEmitter();

  subscription: Subscription = new Subscription();
  activeFilters: number = 0;
  openSearch = false;

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
  ) { }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(({ filterCount }) => this.activeFilters = filterCount?.total || 0);
    this.subscription.add(subscription);
  }

  clear() {
    if (this.disabled) {
      return;
    }
    this.freetextFilter.clear();
    this.toggleMobileSearch(false);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleMobileSearch(force?) {
    if (this.disabled || !this.responsiveService.isMobile()) {
      return;
    }
    this.openSearch = force !== undefined ? force : !this.openSearch;
  }
}
