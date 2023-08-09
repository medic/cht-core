import { AfterViewInit, Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

import { DeleteDocsService } from '@mm-services/delete-docs.service';
import { TelemetryService } from '@mm-services/telemetry.service';

@Component({
  selector: 'bulk-delete-confirm',
  templateUrl: './bulk-delete-confirm.component.html'
})
export class BulkDeleteConfirmComponent implements AfterViewInit {
  static id = 'bulk-delete-confirm-modal';

  totalDocsSelected = 0;
  totalDocsDeleted = 0;
  deleteComplete = false;
  processing = false;
  error;
  docs = [] as any[];
  type;

  constructor(
    private deleteDocsService: DeleteDocsService,
    private telemetryService: TelemetryService,
    private matDialogRef: MatDialogRef<BulkDeleteConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public matDialogData: Record<string, any>,
  ) {
    this.docs = this.matDialogData.docs || [];
    this.type = this.matDialogData.type;
  }

  ngAfterViewInit() {
    this.matDialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => this.deleteComplete && window.location.reload());
  }

  private updateTotalDocsDeleted(totalDocsDeleted) {
    this.totalDocsDeleted = totalDocsDeleted;
  }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    if (this.deleteComplete) {
      return window.location.reload();
    }

    const docs = this.docs;
    this.totalDocsSelected = docs.length;
    this.totalDocsDeleted = 0;
    this.processing = true;
    return this.deleteDocsService
      .delete(docs, { progress: this.updateTotalDocsDeleted.bind(this) })
      .then(() => {
        this.deleteComplete = true;
        this.telemetryService.record(`bulk_delete:${this.type}`, this.totalDocsSelected);
      })
      .catch(error => {
        this.error = 'Error deleting document';
        console.error(this.error, error);
      })
      .finally(() => this.processing = false);
  }
}
