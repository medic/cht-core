import { Component, EventEmitter, OnDestroy, Input, Output, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest, Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Selectors } from '../../../selectors';
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

  private inputTextChanged: Subject<any> = new Subject<any>();

  currentTab;

  @Input() disabled;
  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
  ) {

    this.globalActions = new GlobalActions(store);

    const inputSubscription = this
      .inputTextChanged
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(({ value, apply }={}) => {
        this.applyFieldChange(value, apply);
      });
    this.subscription.add(inputSubscription);
  }

  ngOnInit() {
    const subscription = combineLatest(
      this.store.select(Selectors.getCurrentTab),
      this.store.select(Selectors.getFilters),
    ).subscribe(([
      currentTab,
      filters,
    ]) => {
      this.currentTab = currentTab;
      this.inputText = filters.search;
    });
    this.subscription.add(subscription);
  }

  onFieldChange(inputText) {
    this.inputTextChanged.next({ value: inputText, apply: true });
  }

  applyFieldChange(value, apply?) {
    this.inputText = value;
    apply && this.applyFilter();
  }

  applyFilter() {
    this.globalActions.setFilter({ search: this.inputText });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  clear() {
    this.inputTextChanged.next({ value: '', apply: false });
  }
}

