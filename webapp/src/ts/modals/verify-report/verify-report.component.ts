import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'verify-report',
  templateUrl: './verify-report.component.html'
})
export class VerifyReportComponent {
  static id = 'verify-report-modal';

  proposedVerificationState;

  constructor(
    private matDialogRef: MatDialogRef<VerifyReportComponent>,
    @Inject(MAT_DIALOG_DATA) private matDialogData: Record<string, boolean>,
  ) {
    this.proposedVerificationState = this.matDialogData?.proposedVerificationState;
  }

  close(result) {
    this.matDialogRef.close(result);
  }
}
