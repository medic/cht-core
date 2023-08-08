import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'check-date',
  templateUrl: './check-date.component.html'
})
export class CheckDateComponent {
  static id = 'check-date-modal';

  reportedLocalDate;
  expectedLocalDate;

  constructor(
    private matDialogRef: MatDialogRef<CheckDateComponent>,
    @Inject(MAT_DIALOG_DATA) public matDialogData: Record<string, any>,
  ) {
    this.reportedLocalDate = this.matDialogData.reportedLocalDate;
    this.expectedLocalDate = this.matDialogData.expectedLocalDate;
  }

  close() {
    this.matDialogRef.close();
  }
}
