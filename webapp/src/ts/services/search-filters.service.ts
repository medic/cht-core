import { Injectable } from '@angular/core';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';

@Injectable({
  providedIn: 'root'
})
export class SearchFiltersService {
  freetextFilter:FreetextFilterComponent | null;

  constructor() {
  }

  init(freetextFilter) {
    this.freetextFilter = freetextFilter;
  }

  destroy() {
    this.freetextFilter = null;
  }

  freetextSearch(query) {
    this.freetextFilter?.applyFieldChange(query, true);
  }
}
