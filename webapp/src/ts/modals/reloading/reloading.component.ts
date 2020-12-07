import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'reloading-modal',
  templateUrl: './reloading.component.html'
})
export class ReloadingComponent  extends MmModalAbstract {
  constructor(bsModalRef: BsModalRef) {
    super(bsModalRef);
  }

  static id = 'reloading-modal';

  submit() {
    this.close();
    window.location.reload();
  }
}
