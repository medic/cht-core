import { Component, Input } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TranslateDirective } from '@ngx-translate/core';

@Component({
  selector: 'mm-contact-summary-content',
  templateUrl: './contact-summary-content.component.html',
  imports: [
    LowerCasePipe,
    TranslateDirective,
    ResourceIconPipe
]
})
export class ContactSummaryContentComponent {
  @Input() contactsLoadingSummary;
  @Input() fields;

  constructor() { }
}
