import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import {SessionService} from '../../services/session.service';

@Component({
  selector: 'logout-confirm-modal',
  templateUrl: './logout-confirm.component.html'
})
export class LogoutConfirmComponent {
  constructor(
    public bsModalRef: BsModalRef,
    private sessionService: SessionService,
  ) {}

  submit() {
    this.sessionService.logout().then(() => {
      this.bsModalRef.hide();
    })
  }

  cancel() {
    this.bsModalRef.hide();
  }
}
