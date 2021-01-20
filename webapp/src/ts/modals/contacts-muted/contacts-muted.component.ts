import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'contacts-muted',
  templateUrl: './contacts-muted.component.html'
})
export class ContactsMutedComponent extends MmModalAbstract {
  static id = 'contacts-muted-modal';

  constructor(bsModalRef: BsModalRef) {
    super(bsModalRef);
  }

  submit() {
    this.close();
  }

  closeModal() {
    this.cancel();
  }

}
