import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '../mm-modal/mm-modal';

@Component({
  selector: 'navigation-confirm-modal',
  templateUrl: './navigation-confirm.component.html'
})
export class NavigationConfirmComponent extends MmModalAbstract {
  constructor(
    public bsModalRef: BsModalRef,
  ) {
    super();
  }

  callback; // Automatically assigned by BsModalRef

  cancel() {
    this.bsModalRef.hide();
  }

  submit() {
    this.callback();
    this.bsModalRef.hide();
  }
}
