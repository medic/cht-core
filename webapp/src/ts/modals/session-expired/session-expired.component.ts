import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { SessionService } from '@mm-services/session.service';

@Component({
  selector: 'session-expired',
  templateUrl: './session-expired.component.html'
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
