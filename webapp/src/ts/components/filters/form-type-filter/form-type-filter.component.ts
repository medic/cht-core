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
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '../../../selectors';
import { GlobalActions } from '../../../actions/global';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';

@Component({
  selector: 'mm-form-type-filter',
  templateUrl: './form-type-filter.component.html'
})
export class FormTypeFilterComponent implements OnDestroy, OnInit, AbstractFilter {
  private globalActions;

  subscription: Subscription = new Subscription();
  forms;

  @Input() disabled;
  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter:any = { selected: new Map() };

  constructor(
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    const subscription = combineLatest(
      this.store.select(Selectors.getForms),
    ).subscribe(([
      forms,
    ]) => {
      this.forms = _sortBy(forms, 'name');
    });
    this.subscription.add(subscription);
  }

  applyFilter(forms) {
    this.globalActions.setFilter({ forms: { selected: forms } });
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
    this.dropdownFilter?.clear(false);
  }
}
