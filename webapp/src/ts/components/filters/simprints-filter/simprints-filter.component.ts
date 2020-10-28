import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Store } from '@ngrx/store';

@Component({
  selector: 'mm-simprints-filter',
  templateUrl: './simprints-filter.component.html'
})
export class SimprintsFilterComponent {
  @Input() simprintsEnabled;
  @Output() identify: EventEmitter<any> = new EventEmitter();
  
  simprintsIdentify() {
    this.identify.emit();
  }
}
