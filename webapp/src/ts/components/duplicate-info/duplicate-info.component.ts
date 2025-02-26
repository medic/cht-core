import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'mm-duplicate-info',
  templateUrl: './duplicate-info.component.html',
})
export class DuplicateInfoComponent {
  @Input() entityType: string = '';
  @Input() acknowledged: boolean = false;
  @Output() acknowledgedChange = new EventEmitter<boolean>();
  @Output() navigateToDuplicate = new EventEmitter<string>();
  @Input() duplicates: { _id: string; name: string; reported_date: number; [key: string]: string | number }[] = [];
  @Output() loadContactSummary = new EventEmitter<string>();
  // We need the loading prop to prohibit additional requests
  // We need the contact id in order to appropriately indicate the loading & error elements
  // In the latter case a 'retry' button should be displayed
  @Input() summaryRequestInfo?: { contact_id: string, isLoading: boolean, error?: string };

  toggleAcknowledged() {
    this.acknowledged = !this.acknowledged;
    this.acknowledgedChange.emit(this.acknowledged);
  }

  _navigateToDuplicate(_id: string){
    this.navigateToDuplicate.emit(_id);
  }

  _loadContactSummary(_id: string){
    this.loadContactSummary.emit(_id);
  }
}
