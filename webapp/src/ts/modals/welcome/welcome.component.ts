import { MmModalAbstract } from '../mm-modal/mm-modal';

import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'welcome',
  templateUrl: './welcome.component.html'
})
export class WelcomeComponent extends MmModalAbstract {

  constructor(bsModalRef: BsModalRef) {
    super(bsModalRef);
  }
}
