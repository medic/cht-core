import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SimpleDatePipe } from '@mm-pipes/date.pipe';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription
} from '@angular/material/expansion';
import {
  ContactSummaryContentComponent
} from '@mm-components/contact-summary-content/contact-summary-content.component';

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
    ContactSummaryContentComponent
  ]
})
export class DuplicateContactsComponent {
  @Input() duplicate: { _id: string; name: string; reported_date: number;[key: string]: string | number; } | undefined;
  @Input() loadContactSummary: ((id: string) => Promise<void>) | undefined;
  @Input() isLoading: boolean = false;
  @Input() error?: string = undefined;
  @Output() navigateToDuplicate = new EventEmitter<string>();

  _summary;

  _navigateToDuplicate(_id: string){
    this.navigateToDuplicate.emit(_id);
  }

  async _loadContactSummary(duplicateId?: string){
    if (!duplicateId){
      return;
    }
    
    if (this.isLoading){
      return;
    }

    this.isLoading = true;
    this.error = undefined;

    try {
      this._summary = await this.loadContactSummary?.(duplicateId);
    } catch (err) {
      this.error = `Unable to load summary data for contact ${duplicateId}`;
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  onKeyDown(event: KeyboardEvent, duplicateId?: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._loadContactSummary(duplicateId);
    }
  }
}
