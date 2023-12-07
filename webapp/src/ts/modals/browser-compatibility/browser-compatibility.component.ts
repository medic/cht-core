import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'browser-compatibility-modal',
  templateUrl: './browser-compatibility.component.html'
})
export class BrowserCompatibilityComponent {
  static id = 'browser-compatibility-modal';

  constructor(private matDialogRef: MatDialogRef<BrowserCompatibilityComponent>) {
  }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.close();
  }
}
