import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { TelemetryService } from '@mm-services/telemetry.service';

@Component({
  selector: 'navigation-confirm-modal',
  templateUrl: './navigation-confirm.component.html'
})
export class NavigationConfirmComponent {
  static id = 'navigation-confirm-modal';
  messageTranslationKey;
  telemetryEntry;

  constructor(
    private telemetryService:TelemetryService,
    private matDialogRef: MatDialogRef<NavigationConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public matDialogData: Record<string, any>,
  ) {
    this.messageTranslationKey = this.matDialogData.messageTranslationKey;
    this.telemetryEntry = this.matDialogData.telemetryEntry;
  }

  close(confirm) {
    this.recordTelemetry(confirm);
    this.matDialogRef.close(confirm);
  }

  private recordTelemetry(confirm) {
    if (!this.telemetryEntry) {
      return;
    }

    const telemetryKey = `${this.telemetryEntry}${confirm ? 'confirm' : 'reject'}`;
    this.telemetryService.record(telemetryKey);
  }
}
