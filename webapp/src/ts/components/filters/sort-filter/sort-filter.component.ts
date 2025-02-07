import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-sort-filter',
  templateUrl: './sort-filter.component.html',
  standalone: true,
  imports: [NgIf, BsDropdownModule, TranslatePipe]
})
export class SortFilterComponent {
  @Input() lastVisitedDateExtras;
  @Input() sortDirection;
  @Output() sort: EventEmitter<any> = new EventEmitter();

  applySort(direction) {
    this.sort.emit(direction);
  }
}
