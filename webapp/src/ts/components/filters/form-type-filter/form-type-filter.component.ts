import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output, ViewChild, Input } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { GlobalActions } from '../../../actions/global';
import { sortBy as _sortBy } from 'lodash-es';
import { MultiDropdownFilterComponent } from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';

@Component({
  selector: 'mm-form-type-filter',
  templateUrl: './form-type-filter.component.html'
})
export class FormTypeFilterComponent implements OnDestroy, AbstractFilter {
  private subscription: Subscription = new Subscription();
  private globalActions;
  forms;

  @Input() disabled;
  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter: MultiDropdownFilterComponent;

  constructor(
    private store:Store,
    private cd: ChangeDetectorRef,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getForms)),
    ).subscribe(([
      forms,
    ]) => {
      this.forms = _sortBy(forms, 'name');
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    // this is needed because the change detection doesn't run normally at this point, and we're using the
    // child component's methods in the view.
    this.cd.detectChanges();
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
