import { Component, ViewChild, Output, Input, EventEmitter } from '@angular/core';
import { GlobalActions } from '@mm-actions/global';
import { Store } from '@ngrx/store';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { SimprintsFilterComponent } from '@mm-components/filters/simprints-filter/simprints-filter.component';

@Component({
  selector: 'contacts-filters',
  templateUrl: './contacts-filters.component.html'
})
export class ContactsFiltersComponent {
  private globalActions;

  constructor(
    private store: Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  @Output() search: EventEmitter<any> = new EventEmitter();
  @Output() simIdentify: EventEmitter<any> = new EventEmitter();
  @Output() sort: EventEmitter<any> = new EventEmitter();
  @Input() reset;
  @Input() disabled;
  @Input() simprintsEnabled;
  @Input() sortDirection;
  @Input() lastVisitedDateExtras;

  @ViewChild(FreetextFilterComponent)
  freetextFilter:FreetextFilterComponent;

  @ViewChild(SimprintsFilterComponent)
  simprintsFilter:SimprintsFilterComponent;

  applyFilters(force?) {
    this.search.emit(force);
  }

  simprintsIdentify() {
    this.simIdentify.emit();
  }

  resetFilters() {
    this.globalActions.clearFilters();
    this.freetextFilter?.clear();
    this.applyFilters();
  }

  applySort(direction) {
    this.sort.emit(direction);
  }
}
