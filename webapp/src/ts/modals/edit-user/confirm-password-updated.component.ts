import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'confirm-password-updated-modal',
  templateUrl: './confirm-password-updated.component.html'
})
export class ConfirmPasswordUpdatedComponent extends MmModalAbstract {
  static id = 'confirm-password-updated-modal';

  constructor(
    bsModalRef: BsModalRef,
  ) {
    super(bsModalRef);
  }

  submit() {
    window.location.reload();
  }
}
