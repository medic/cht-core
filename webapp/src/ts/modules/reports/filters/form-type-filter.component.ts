import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { SearchFiltersService } from '../../../services/search-filters.service';
import { GlobalActions } from '../../../actions/global';
import * as _ from 'lodash-es';

@Component({
  selector: 'mm-form-type-filter',
  templateUrl: './form-type-filter.component.html'
})
export class FormTypeFilterComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;
  forms;
  selectMode;
  selectedReports;

  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store:Store,
    private searchFiltersService:SearchFiltersService,
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
      this.forms = _.sortBy(forms, 'name');
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.searchFiltersService.formType((forms) => {
      this.globalActions.setFilter({ forms });
      this.search.emit();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackByFn(idx, element) {
    return element.code;
  }
}
