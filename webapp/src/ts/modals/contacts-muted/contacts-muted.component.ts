import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'contacts-muted',
  templateUrl: './contacts-muted.component.html'
})
export class ContactsMutedComponent {
  static id = 'contacts-muted-modal';

  constructor(private matDialogRef: MatDialogRef<ContactsMutedComponent>) { }

  close(result) {
    this.matDialogRef.close(result);
  }
}
