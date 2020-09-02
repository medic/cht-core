import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import {Session} from "../../services/session.service";

@Component({
  selector: 'logout-confirm-modal',
  templateUrl: './logout-confirm.component.html'
})
export class LogoutConfirmComponent {
  constructor(
    public bsModalRef: BsModalRef,
    private session: Session,
  ) {}

  submit() {
    this.session.logout().then(() => {
      this.bsModalRef.hide();
    })
  }

  cancel() {
    this.bsModalRef.hide();
  }
}
