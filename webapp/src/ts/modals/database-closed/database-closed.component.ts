import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'database-closed',
  templateUrl: './database-closed.component.html',
  imports: [ModalLayoutComponent, TranslatePipe]
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
