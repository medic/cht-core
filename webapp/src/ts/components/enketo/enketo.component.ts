import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-enketo',
  templateUrl: './enketo.component.html',
  imports: [NgIf, TranslatePipe],
})
export class EnketoComponent {
  // string: (optional) modal element id
  @Input() formId;
  // string: (optional) data to include in the data-editing attribute
  @Input() editing;
  // object: object with 'saving', and 'error' properties to update form status
  @Input() status;
  // function: to be called when cancelling out of the form
  @Output() onCancel: EventEmitter<any> = new EventEmitter();
  // function: to be called when submitting the form
  @Output() onSubmit: EventEmitter<any> = new EventEmitter();
}
