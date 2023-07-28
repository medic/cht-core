import { Injectable } from '@angular/core';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';

@Injectable({
  providedIn: 'root'
})
export class SearchFiltersService {
  freetextFilter?:FreetextFilterComponent;

  constructor() {
  }

  init(freetextFilter) {
    this.freetextFilter = freetextFilter;
  }

  destroy() {
    this.freetextFilter = undefined;
  }

  freetextSearch(query) {
    this.freetextFilter?.applyFieldChange(query, true);
  }
}
