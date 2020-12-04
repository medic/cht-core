import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import {SessionService} from '../../services/session.service';
import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'logout-confirm-modal',
  templateUrl: './logout-confirm.component.html'
})
export class LogoutConfirmComponent extends MmModalAbstract {
  static id = 'logout-confirm-modal';

  constructor(
    bsModalRef: BsModalRef,
    private sessionService: SessionService,
  ) {
    super(bsModalRef);
  }

  submit() {
    this.sessionService.logout().then(() => {
      this.close();
    });
  }
}
