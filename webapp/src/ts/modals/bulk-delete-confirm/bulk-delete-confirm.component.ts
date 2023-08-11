import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DeleteDocsService } from '@mm-services/delete-docs.service';
import { TelemetryService } from '@mm-services/telemetry.service';

@Component({
  selector: 'bulk-delete-confirm',
  templateUrl: './bulk-delete-confirm.component.html'
})
export class BulkDeleteConfirmComponent {
  static id = 'bulk-delete-confirm-modal';

  totalDocsSelected = 0;
  totalDocsDeleted = 0;
  processing = false;
  error;
  docs = [] as any[];
  type;

  constructor(
    private deleteDocsService: DeleteDocsService,
    private telemetryService: TelemetryService,
    private matDialogRef: MatDialogRef<BulkDeleteConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) private matDialogData: Record<string, any>,
  ) {
    this.docs = this.matDialogData.docs || [];
    this.type = this.matDialogData.type;
  }

  private updateTotalDocsDeleted(totalDocsDeleted) {
    this.totalDocsDeleted = totalDocsDeleted;
  }

  close() {
    this.matDialogRef.close();
  }

  async submit(reload = true) {
    try {
      this.totalDocsSelected = this.docs.length;
      this.totalDocsDeleted = 0;
      this.processing = true;
      await this.deleteDocsService.delete(this.docs, { progress: this.updateTotalDocsDeleted.bind(this) });
    } catch (error) {
      this.error = 'Error deleting document';
      console.error(this.error, error);
      return;
    } finally {
      this.processing = false;
    }

    this.telemetryService.record(`bulk_delete:${this.type}`, this.totalDocsSelected);
    reload && window.location.reload(); // On testing we don't reload
  }
}
