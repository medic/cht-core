import { Component, EventEmitter, OnDestroy, Output, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { sortBy as _sortBy } from 'lodash-es';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { Filter } from '@mm-components/filters/filter';
import { NgFor } from '@angular/common';

@Component({
  selector: 'mm-form-type-filter',
  templateUrl: './form-type-filter.component.html',
  imports: [NgFor]
})
export class FormTypeFilterComponent implements OnDestroy, OnInit {
  private globalActions: GlobalActions;
  private formsSubscription;
  forms;
  subscriptions: Subscription = new Subscription();
  filter: Filter;

  @Input() disabled;
  @Input() fieldId;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
    this.filter = new Filter(this.applyFilter.bind(this));
  }

  ngOnInit() {
    this.subscribeToSidebarStore();
  }

  private subscribeToSidebarStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(sidebarFilter => sidebarFilter?.isOpen && !this.formsSubscription && this.subscribeToFormStore());
    this.subscriptions.add(subscription);
  }

  private subscribeToFormStore() {
    this.formsSubscription = this.store
      .select(Selectors.getForms)
      .subscribe(forms => this.forms = _sortBy(forms, 'title'));
    this.subscriptions.add(this.formsSubscription);
  }

  applyFilter(forms) {
    let selectedForms;

    if (forms.length) {
      selectedForms = { selected: forms };
    }

    this.globalActions.setFilter({ forms: selectedForms });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  trackByFn(idx, element) {
    return element.code;
  }

  itemLabel(form) {
    return form.title || form.code;
  }

  clear() {
    if (this.disabled) {
      return;
    }

    this.filter.clear();
  }

  countSelected() {
    return this.filter?.countSelected();
  }
}
