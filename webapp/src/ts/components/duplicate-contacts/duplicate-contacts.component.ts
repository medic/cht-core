import { Component, Input } from '@angular/core';

import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SimpleDatePipe } from '@mm-pipes/date.pipe';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
  MatExpansionPanelActionRow
} from '@angular/material/expansion';
import { FormService } from '@mm-services/form.service';
import { TranslateService } from '@mm-services/translate.service';
import {
  ContactSummaryContentComponent
} from '@mm-components/contact-summary-content/contact-summary-content.component';
import { Contact } from '@medic/cht-datasource';

@Component({
  selector: 'mm-duplicate-contacts',
  templateUrl: './duplicate-contacts.component.html',
  imports: [
    TranslatePipe,
    SimpleDatePipe,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatExpansionPanelActionRow,
    ContactSummaryContentComponent
]
})
export class DuplicateContactsComponent {
  @Input() duplicate?: Contact.v1.Contact;
  isLoading: boolean = false;
  error?: string;
  contactSummary?: Record<string, unknown>;

  constructor(
    private readonly router: Router,
    private readonly formService: FormService,
    private readonly translateService: TranslateService
  ){}

  navigateToDuplicate() {
    this.router.navigate(['/contacts', this.duplicate!._id]);
  }
  
  loadContactSummary = async () => {
    if (this.contactSummary || !this.duplicate?._id || this.isLoading){
      return;
    }

    this.isLoading = true;
    
    try {
      this.contactSummary = await this.formService.loadContactSummary(this.duplicate);
    } catch (err){
      this.error = await this.translateService.get('duplicate_check.contact.summary_error');
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  };
}
