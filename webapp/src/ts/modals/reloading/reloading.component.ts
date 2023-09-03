import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'reloading-modal',
  templateUrl: './reloading.component.html'
})
export class ReloadingComponent {
  static id = 'reloading-modal';

  constructor(private matDialogRef: MatDialogRef<ReloadingComponent>) { }

  close(reload = false) {
    this.matDialogRef.close(reload);
  }

  submit() {
    this.close(true);
    window.location.reload();
  }
}
