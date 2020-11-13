import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'reloading-modal',
  templateUrl: './reloading.component.html'
})
export class ReloadingComponent  extends MmModalAbstract {
  constructor(public bsModalRef: BsModalRef) {
    super(bsModalRef);
  }

  static id = 'reloadingModal';

  submit() {
    this.close();
    window.location.reload();
  }
}
