import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '../mm-modal/mm-modal';

@Component({
  selector: 'navigation-confirm-modal',
  templateUrl: './navigation-confirm.component.html'
})
export class NavigationConfirmComponent extends MmModalAbstract {
  static id = 'navigation-confirm';

  constructor(
    bsModalRef: BsModalRef,
  ) {
    super(bsModalRef);
  }

  submit() {
    this.close();
  }
}
