import { Component, AfterViewInit } from '@angular/core';
import { take } from 'rxjs/operators';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'confirm-password-updated-modal',
  templateUrl: './confirm-password-updated.component.html'
})
export class ConfirmPasswordUpdatedComponent implements AfterViewInit {
  static id = 'confirm-password-updated-modal';

  constructor(
    private matDialogRef: MatDialogRef<ConfirmPasswordUpdatedComponent>,
  ) { }

  ngAfterViewInit() {
    this.matDialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() =>  window.location.reload());
  }

  close() {
    this.matDialogRef.close();
  }
}
