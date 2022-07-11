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
  @Output() openFilter: EventEmitter<any> = new EventEmitter();
  @Output() resetFilter: EventEmitter<any> = new EventEmitter();
  @Input() filterCount:any = {};
  @Input() disabled;
  private subscription: Subscription = new Subscription();

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

  constructor(
    private store: Store,
  ) { }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(({ filterCount }) => this.filterCount = filterCount);
    this.subscription.add(subscription);
  }

  reset() {
    this.freetextFilter.clear();
    this.resetFilter.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
