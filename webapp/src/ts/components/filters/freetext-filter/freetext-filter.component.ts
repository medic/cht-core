import { Component, EventEmitter, OnDestroy, Input, Output, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';

@Component({
  selector: 'mm-freetext-filter',
  templateUrl: './freetext-filter.component.html'
})
export class FreetextFilterComponent implements OnDestroy, OnInit, AbstractFilter {
  private globalActions;

  subscription: Subscription = new Subscription();
  inputText;

  @Input() disabled;
  @Input() mobileDropdown;
  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild('freetextInput') inputElement;

  constructor(
    private store: Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getFilters)
      .subscribe(filters => this.inputText = filters?.search);
    this.subscription.add(subscription);
  }

  applyFieldChange(value, apply?) {
    this.inputText = value;
    apply && this.applyFilter();
  }

  applyFilter() {
    if (this.disabled) {
      return;
    }

    this.globalActions.setFilter({ search: this.inputText });
    this.search.emit();

    if (this.inputElement) {
      // Closing mobile's soft keyboard when search is triggered.
      this.inputElement.nativeElement.blur();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  clear(apply?) {
    if (this.disabled) {
      return;
    }
    this.applyFieldChange('', apply);
  }
}

