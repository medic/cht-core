import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mm-sort-filter',
  templateUrl: './sort-filter.component.html'
})
export class SortFilterComponent {
  @Input() lastVisitedDateExtras;
  @Input() sortDirection;
  @Output() sort: EventEmitter<any> = new EventEmitter();

  applySort(direction) {
    this.sort.emit(direction);
  }
}
