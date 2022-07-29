import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'mm-reports-actions-bar',
  templateUrl: './reports-actions-bar.component.html'
})
export class ReportsActionsBarComponent implements OnInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();
  @Output() resetFilter: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  subscription: Subscription = new Subscription();
  activeFilters: number = 0;

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

  constructor(
    private store: Store,
  ) { }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(({ filterCount }) => this.activeFilters = filterCount?.total || 0);
    this.subscription.add(subscription);
  }

  reset() {
    if (this.disabled) {
      return;
    }
    this.freetextFilter.clear();
    this.resetFilter.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
