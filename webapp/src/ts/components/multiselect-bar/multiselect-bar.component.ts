import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mm-multiselect-bar',
  templateUrl: './multiselect-bar.component.html'
})
export class MultiselectBarComponent {
  @Input() display = 'desktop';
  @Input() selectedCount = 0;
  @Input() totalItems = 0;
  @Output() deleteItems: EventEmitter<any> = new EventEmitter();
  @Output() deselectItems: EventEmitter<any> = new EventEmitter();
  @Output() selectItems: EventEmitter<any> = new EventEmitter();

  constructor() { }
}
