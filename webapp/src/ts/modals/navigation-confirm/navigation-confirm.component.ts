import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '../mm-modal/mm-modal';
import { TelemetryService } from '@mm-services/telemetry.service';

@Component({
  selector: 'navigation-confirm-modal',
  templateUrl: './navigation-confirm.component.html'
})
export class NavigationConfirmComponent extends MmModalAbstract {
  static id = 'navigation-confirm-modal';
  messageTranslationKey;
  telemetryEntry;

  constructor(
    bsModalRef: BsModalRef,
    private telemetryService:TelemetryService,
  ) {
    super(bsModalRef);
  }

  submit() {
    this.recordTelemetry(true);
    this.close();
  }

  cancel() {
    this.recordTelemetry(false);
    super.cancel();
  }

  private recordTelemetry(confirm) {
    if (!this.telemetryEntry) {
      return;
    }

    const telemetryKey = `${this.telemetryEntry}${confirm ? 'confirm' : 'reject'}`;
    this.telemetryService.record(telemetryKey);
  }
}
