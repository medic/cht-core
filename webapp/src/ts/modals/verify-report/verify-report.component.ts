import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'verify-report',
  templateUrl: './verify-report.component.html'
})
export class VerifyReportComponent extends MmModalAbstract {
  static id = 'verify-report';

  model = { proposedVerificationState: undefined };

  constructor(
    bsModalRef: BsModalRef,
  ) {
    super(bsModalRef);
  }
}
