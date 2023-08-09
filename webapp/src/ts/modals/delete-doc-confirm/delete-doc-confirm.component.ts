import { Component, OnDestroy, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as LineageFactory from '@medic/lineage';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { DbService } from '@mm-services/db.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';

@Component({
  selector: 'delete-doc-confirm',
  templateUrl: './delete-doc-confirm.component.html'
})
export class DeleteDocConfirmComponent implements OnInit, OnDestroy {
  static id = 'delete-doc-confirm-modal';
  private globalActions: GlobalActions;
  private selectMode;

  processing = false;
  doc = null as any;
  subscriptions: Subscription = new Subscription();
  lineageLib;
  error;

  constructor(
    private store: Store,
    private translateService: TranslateService,
    private dbService: DbService,
    private router: Router,
    private matDialogRef: MatDialogRef<DeleteDocConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public matDialogData: Record<string, any>,
  ) {
    this.globalActions = new GlobalActions(this.store);
    this.lineageLib = LineageFactory(Promise, this.dbService.get());
    this.doc = this.matDialogData?.doc;
  }

  ngOnInit(): void {
    const subscription = this.store
      .select(Selectors.getSelectMode)
      .subscribe(selectMode => this.selectMode = selectMode);
    this.subscriptions.add(subscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getRoute(doc, url = '') {
    const contacts = 'contacts';
    const reports = 'reports';

    if (url.includes(contacts)) {
      return { name: contacts, parameter: doc?.parent?._id };
    }

    if (url.includes(reports)) {
      return { name: reports };
    }
  }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.processing = true;
    const doc = { ...this.doc };
    doc._deleted = true;
    this.lineageLib.minify(doc);

    this.dbService
      .get()
      .put(doc)
      .then(() => {
        const text = this.translateService.instant('document.deleted');
        const route = this.getRoute(doc, this.router.url);
        this.globalActions.setSnackbarContent(text);
        this.close();

        if (!this.selectMode && route?.name) {
          this.router.navigate([route.name, route.parameter || '']);
        }
      })
      .catch(error => {
        this.error = 'Error deleting document';
        console.error(this.error, error);
      })
      .finally(() => this.processing = false);
  }

}
