import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import * as LineageFactory from '@medic/lineage';
import { TranslateService } from '@ngx-translate/core';

import { DbService } from '@mm-services/db.service';
import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { GlobalActions } from '@mm-actions/global';
import { Store } from '@ngrx/store';

@Component({
  selector: 'delete-doc-confirm',
  templateUrl: './delete-doc-confirm.component.html'
})
export class DeleteDocConfirmComponent extends MmModalAbstract implements OnInit {

  private globalActions: GlobalActions;
  lineageLib;
  model = { doc: null }; // Automatically assigned by BsModalRef

  constructor(
    private store: Store,
    private translateService: TranslateService,
    private bsModalRef: BsModalRef,
    private dbService: DbService
  ) {
    super();
    this.globalActions = new GlobalActions(this.store);
    this.lineageLib = LineageFactory(Promise, this.dbService.get());
  }

  ngOnInit(): void { }

  close() {
    this.bsModalRef.hide();
  }

  submit() {
    const doc = { ...this.model.doc };
    doc._deleted = true;

    this.lineageLib.minify(doc);

    this.dbService
      .get()
      .put(doc)
      .then(() => {
        const text = this.translateService.instant('document.deleted');
        this.globalActions.setSnackbarContent(text); // ToDo test!!!!
        this.close();

        /**
         *  const selectMode = Selectors.getSelectMode(getState());
         if (
         !selectMode &&
         ($state.includes('contacts') || $state.includes('reports'))
         ) {
            $state.go($state.current.name, { id: null });
          }
         */

      })
      .catch((err) => this.setError(err, 'Error deleting document'));
  }

}
