import { MmModalAbstract } from '../mm-modal/mm-modal';

import { Component, Input } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'check-date',
  templateUrl: './check-date.component.html'
})
export class CheckDateComponent extends MmModalAbstract {

  @Input() reportedLocalDate;
  @Input() expectedLocalDate;

  constructor(
    bsModalRef: BsModalRef,
  ) {
    super(bsModalRef);
  }
}
