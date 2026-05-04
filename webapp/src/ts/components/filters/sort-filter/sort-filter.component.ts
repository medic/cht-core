import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TranslatePipe } from '@ngx-translate/core';
import { DropdownTrackingDirective } from '@mm-directives/dropdown-tracking.directive';

@Component({
  selector: 'mm-sort-filter',
  templateUrl: './sort-filter.component.html',
  imports: [NgIf, BsDropdownModule, TranslatePipe, DropdownTrackingDirective]
})
export class SortFilterComponent {
  @Input() lastVisitedDateExtras;
  @Input() sortDirection;
  @Output() sort: EventEmitter<any> = new EventEmitter();

  applySort(direction) {
    this.sort.emit(direction);
  }
}
