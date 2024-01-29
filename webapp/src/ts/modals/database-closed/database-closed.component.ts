import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'database-closed',
  templateUrl: './database-closed.component.html'
})
export class DatabaseClosedComponent {
  static id = 'database-closed-modal';

  constructor(private matDialogRef: MatDialogRef<DatabaseClosedComponent>) { }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.close();
    window.location.reload();
  }
}
