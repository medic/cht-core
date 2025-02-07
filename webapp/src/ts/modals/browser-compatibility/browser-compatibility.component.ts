import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'browser-compatibility-modal',
  templateUrl: './browser-compatibility.component.html',
  imports: [ModalLayoutComponent, TranslatePipe]
})
export class BrowserCompatibilityComponent {
  static id = 'browser-compatibility-modal';

  constructor(private matDialogRef: MatDialogRef<BrowserCompatibilityComponent>) {
  }

  close() {
    this.matDialogRef.close();
  }
}
