import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
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
    NgIf,
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
  @Input() duplicate: Contact.v1.Contact | undefined;
  isLoading: boolean = false;
  error?: string = undefined;
  _summary;

  private readonly omitProperties = ['reported_date', 'name'];

  constructor(
    private readonly router: Router,
    private readonly formService: FormService,
    private readonly translateService: TranslateService
  ){}

  _navigateToDuplicate() {
    this.router.navigate(['/contacts', this.duplicate!._id]);
  }
  
  _loadContactSummary = async () => {
    if (!this.duplicate?._id){
      return;
    }
    
    if (this.isLoading){
      return;
    }

    this.isLoading = true;
    this.error = undefined;
    
    try {
      const sanitizedContact = Object.keys(this.duplicate).reduce((acc, key) => {
        if (!this.omitProperties.includes(key)) {
          acc[key] = this.duplicate![key];
        }
        return acc;
      }, {});

      this._summary = await this.formService.loadContactSummary(sanitizedContact);
    } catch (err){
      this.error = await this.translateService.get('duplicate_check.contact.summary_error');
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  };
}
