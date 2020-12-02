import { MmModalAbstract } from '../mm-modal/mm-modal';
import { SessionService } from '@mm-services/session.service';

import { BsModalRef } from 'ngx-bootstrap/modal';
import {Component} from '@angular/core';


@Component({
  selector: 'session-expired',
  templateUrl: './session-expired.component.html'
})
export class SessionExpiredComponent extends MmModalAbstract {

  static id = 'session-expired-modal'; // to make the modal singleton

  constructor(
    bsModalRef:BsModalRef,
    private sessionService:SessionService,
  ) {
    super(bsModalRef);
  }

  submit() {
    this.close();
    this.sessionService.navigateToLogin();
  }
}
