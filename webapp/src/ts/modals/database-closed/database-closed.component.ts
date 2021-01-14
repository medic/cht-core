import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'database-closed',
  templateUrl: './database-closed.component.html'
})
export class DatabaseClosedComponent extends MmModalAbstract {
  static id = 'database-closed-modal';

  constructor(bsModalRef: BsModalRef) {
    super(bsModalRef);
  }

  submit() {
    this.close();
    window.location.reload();
  }

}
