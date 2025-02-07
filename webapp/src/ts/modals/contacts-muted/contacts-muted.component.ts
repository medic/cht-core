import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'contacts-muted',
  templateUrl: './contacts-muted.component.html',
  imports: [ModalLayoutComponent, TranslatePipe]
})
export class ContactsMutedComponent {
  static id = 'contacts-muted-modal';

  constructor(private matDialogRef: MatDialogRef<ContactsMutedComponent>) { }

  close(result) {
    this.matDialogRef.close(result);
  }
}
