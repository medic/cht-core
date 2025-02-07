import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { SessionService } from '@mm-services/session.service';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'logout-confirm-modal',
  templateUrl: './logout-confirm.component.html',
  standalone: true,
  imports: [ModalLayoutComponent, TranslatePipe]
})
export class LogoutConfirmComponent {
  static id = 'logout-confirm-modal';

  constructor(
    private sessionService: SessionService,
    private matDialogRef: MatDialogRef<LogoutConfirmComponent>,
  ) { }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.sessionService
      .logout()
      .then(() => this.close());
  }
}
