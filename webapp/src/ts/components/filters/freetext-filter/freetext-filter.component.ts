import { Component, EventEmitter, OnDestroy, Input, Output } from '@angular/core';
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
export class FreetextFilterComponent implements OnDestroy, AbstractFilter {
  private globalActions;

  subscription: Subscription = new Subscription();
  inputText;

  private inputTextChanged: Subject<string> = new Subject<string>();

  currentTab;

  @Input() disabled;
  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getCurrentTab)),
    ).subscribe(([
      currentTab,
    ]) => {
      this.currentTab = currentTab;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);

    const inputSubscription = this
      .inputTextChanged
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        this.inputText = value;
        this.applyFilter();
      });
    this.subscription.add(inputSubscription);
  }

  onFieldChange(inputText) {
    this.inputTextChanged.next(inputText);
  }

  applyFilter() {
    this.globalActions.setFilter({ search: this.inputText });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  clear() {
    this.inputText = '';
  }
}

