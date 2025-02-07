import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'reloading-modal',
    templateUrl: './reloading.component.html',
    standalone: true,
    imports: [ModalLayoutComponent, TranslatePipe]
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
