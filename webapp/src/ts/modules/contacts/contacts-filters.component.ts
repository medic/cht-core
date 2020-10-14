import { Component, ViewChild, Output, Input, EventEmitter } from '@angular/core';
import { GlobalActions } from '@mm-actions/global';
import { Store } from '@ngrx/store';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';

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
  @Input() reset;
  @Input() disabled;
  @Input() simprintsEnabled;

  @ViewChild(FreetextFilterComponent)
  freetextFilter:FreetextFilterComponent;

  applyFilters() {
    this.search.emit();
  }

  simprintsIdentify() {
    this.simIdentify.emit();
  }

  resetFilters() {
    this.globalActions.clearFilters();
    this.freetextFilter?.clear();
    this.applyFilters();
  }
}
