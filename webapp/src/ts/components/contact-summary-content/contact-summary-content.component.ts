import { Component, Input } from '@angular/core';

@Component({
  selector: 'mm-contact-summary-content',
  templateUrl: './contact-summary-content.component.html'
})
export class ContactSummaryContentComponent {
  @Input() contactsLoadingSummary;
  @Input() fields;

  constructor() { }
}
