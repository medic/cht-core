import { Injectable } from '@angular/core';
import { FreetextFilterComponent } from '../components/filters/freetext-filter/freetext-filter.component';

@Injectable({
  providedIn: 'root'
})
export class SearchFiltersService {
  freetextFilter:FreetextFilterComponent;

  constructor() {
  }

  init(freetextFilter) {
    this.freetextFilter = freetextFilter;
  }

  freetextSearch(query) {
    this.freetextFilter?.applyFieldChange(query, true);
  }
}
