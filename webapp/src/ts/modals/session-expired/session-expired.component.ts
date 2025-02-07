import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { SessionService } from '@mm-services/session.service';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { BootstrapTranslatePipe } from '@mm-pipes/bootstrap-translate.pipe';

@Component({
  selector: 'session-expired',
  templateUrl: './session-expired.component.html',
  standalone: true,
  imports: [ModalLayoutComponent, BootstrapTranslatePipe]
})
export class SessionExpiredComponent {
  static id = 'session-expired-modal';

  constructor(
    private sessionService:SessionService,
    private matDialogRef: MatDialogRef<SessionExpiredComponent>,
  ) { }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.close();
    this.sessionService.navigateToLogin();
  }
}
