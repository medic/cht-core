import {
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  Input,
  OnInit
} from '@angular/core';
import { Store } from '@ngrx/store';
import { sortBy as _sortBy } from 'lodash-es';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import {
  MultiDropdownFilterComponent,
  MultiDropdownFilter,
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';
import { InlineFilter } from '@mm-components/filters/inline-filter';

@Component({
  selector: 'mm-form-type-filter',
  templateUrl: './form-type-filter.component.html'
})
export class FormTypeFilterComponent implements OnDestroy, OnInit, AbstractFilter {
  private globalActions;
  forms;
  subscription: Subscription = new Subscription();
  inlineFilter: InlineFilter;

  @Input() disabled;
  @Input() inline;
  @Input() fieldId;
  @Output() search: EventEmitter<any> = new EventEmitter();

  // initialize variable to avoid change detection errors
  @ViewChild(MultiDropdownFilterComponent) dropdownFilter = new MultiDropdownFilter();

  constructor(
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
    this.inlineFilter = new InlineFilter(this.applyFilter.bind(this));
  }

  ngOnInit() {
    const subscription = this.store
      .select(Selectors.getForms)
      .subscribe(forms => this.forms = _sortBy(forms, 'title'));
    this.subscription.add(subscription);
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
    this.subscription.unsubscribe();
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

    if (this.inline) {
      this.inlineFilter.clear();
      return;
    }

    this.dropdownFilter?.clear(false);
  }

  countSelected() {
    return this.inline && this.inlineFilter?.countSelected();
  }
}
