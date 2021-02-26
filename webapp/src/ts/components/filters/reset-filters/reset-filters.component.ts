import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'reset-filters',
  templateUrl: './reset-filters.component.html'
})
export class ResetFiltersComponent {
  @Input() disabled;
  @Output() resetFilters: EventEmitter<any> = new EventEmitter();

  reset() {
    this.resetFilters.emit();
  }
}
