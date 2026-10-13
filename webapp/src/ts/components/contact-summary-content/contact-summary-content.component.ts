import { Component, Input } from '@angular/core';
import { NgIf, NgFor, LowerCasePipe  } from '@angular/common';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TranslateDirective } from '@ngx-translate/core';
import { MapComponent } from '@mm-components/map/map.component';

@Component({
  selector: 'mm-contact-summary-content',
  templateUrl: './contact-summary-content.component.html',
  imports: [
    NgIf,
    NgFor,
    LowerCasePipe,
    TranslateDirective,
    ResourceIconPipe,
    MapComponent,
  ]
})
export class ContactSummaryContentComponent {
  @Input() contactsLoadingSummary;
  @Input() fields;

  constructor() { }
}
