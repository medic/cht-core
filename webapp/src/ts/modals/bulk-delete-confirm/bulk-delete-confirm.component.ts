import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocsService } from '@mm-services/delete-docs.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'bulk-delete-confirm',
  templateUrl: './bulk-delete-confirm.component.html'
})
export class BulkDeleteConfirmComponent extends MmModalAbstract {
  static id = 'bulk-delete-confirm-modal';

  totalDocsSelected = 0;
  totalDocsDeleted = 0;
  deleteComplete = false;

  model = { docs: [] }; // assigned by bsModule

  constructor(
    bsModalRef: BsModalRef,
    private deleteDocsService:DeleteDocsService,
  ) {
    super(bsModalRef);
    bsModalRef.onHidden
      .pipe(take(1)) // so we don't need to unsubscribe
      .subscribe(() => this.deleteComplete && window.location.reload());
  }

  private updateTotalDocsDeleted(totalDocsDeleted) {
    this.totalDocsDeleted = totalDocsDeleted;
  }

  submit() {
    if (this.deleteComplete) {
      return window.location.reload();
    }

    const docs = (this.model?.docs || []).map(doc => ({ ...doc }));
    this.totalDocsSelected = docs.length;
    this.totalDocsDeleted = 0;
    this.setProcessing();
    return this.deleteDocsService
      .delete(docs, { progress: this.updateTotalDocsDeleted.bind(this) })
      .then(() => {
        this.deleteComplete = true;
        this.setFinished();
      })
      .catch((err) => {
        this.setError(err, 'Error deleting document');
      });
  }
}
