import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output, ViewChild } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription } from 'rxjs';
//import { SearchFiltersService } from '../../../services/search-filters.service';
import { GlobalActions } from '../../../actions/global';
import { sortBy as _sortBy } from 'lodash-es';
import { MultiDropdownFilterComponent } from '@mm-components/multi-dropdown-filter/mullti-dropdown-filter.component';

@Component({
  selector: 'mm-form-type-filter',
  templateUrl: './form-type-filter.component.html'
})
export class FormTypeFilterComponent implements OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;
  forms;
  selectMode;
  selectedReports;

  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter: MultiDropdownFilterComponent;

  constructor(
    private store:Store,
    private cd: ChangeDetectorRef,
    //private searchFiltersService:SearchFiltersService,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getForms)),
      this.store.pipe(select(Selectors.getSelectMode)),
      this.store.pipe(select(Selectors.getSelectedReports))
    ).subscribe(([
      forms,
      selectMode,
      selectedReports,
    ]) => {
      this.forms = _sortBy(forms, 'name');
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
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
}
