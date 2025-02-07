import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SimpleDateTimePipe } from '@mm-pipes/date.pipe';

@Component({
  selector: 'check-date',
  templateUrl: './check-date.component.html',
  standalone: true,
  imports: [ModalLayoutComponent, NgIf, TranslatePipe, SimpleDateTimePipe]
})
export class CheckDateComponent {
  static id = 'check-date-modal';

  reportedLocalDate;
  expectedLocalDate;

  constructor(
    private matDialogRef: MatDialogRef<CheckDateComponent>,
    @Inject(MAT_DIALOG_DATA) private matDialogData: Record<string, any>,
  ) {
    this.reportedLocalDate = this.matDialogData.reportedLocalDate;
    this.expectedLocalDate = this.matDialogData.expectedLocalDate;
  }

  close() {
    this.matDialogRef.close();
  }
}
