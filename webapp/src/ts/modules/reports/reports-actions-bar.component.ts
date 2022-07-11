import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';

@Component({
  selector: 'mm-reports-actions-bar',
  templateUrl: './reports-actions-bar.component.html'
})
export class ReportsActionsBarComponent {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Output() openFilter: EventEmitter<any> = new EventEmitter();
  @Output() resetFilter: EventEmitter<any> = new EventEmitter();
  @Input() filterCount:any = {};
  @Input() disabled;

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

  constructor() { }

  reset() {
    this.freetextFilter.clear();
    this.resetFilter.emit();
  }
}
