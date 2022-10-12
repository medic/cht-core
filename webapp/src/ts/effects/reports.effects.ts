import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { map, exhaustMap, filter, catchError, withLatestFrom, concatMap, tap, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import { Actions as ReportActionList, ReportsActions } from '@mm-actions/reports';
import { GlobalActions } from '@mm-actions/global';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { Selectors } from '@mm-selectors/index';
import { MarkReadService } from '@mm-services/mark-read.service';
import { DbService } from '@mm-services/db.service';
import { SearchService } from '@mm-services/search.service';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { VerifyReportComponent } from '@mm-modals/verify-report/verify-report.component';
import { ServicesActions } from '@mm-actions/services';
import { AuthService } from '@mm-services/auth.service';
import { TranslateService } from '@mm-services/translate.service';


@Injectable()
export class ReportsEffects {
  private reportActions: ReportsActions;
  private globalActions: GlobalActions;
  private servicesActions: ServicesActions;

  constructor(
    private actions$:Actions,
    private store:Store,
    private reportViewModelGeneratorService:ReportViewModelGeneratorService,
    private markReadService:MarkReadService,
    private dbService:DbService,
    private router:Router,
    private searchService:SearchService,
    private modalService:ModalService,
    private translateService:TranslateService,
    private authService:AuthService,
  ) {
    this.reportActions = new ReportsActions(store);
    this.globalActions = new GlobalActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  selectReport = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.selectReport),
      filter(({ payload: { id } }) => !!id),
      switchMap(({ payload: { id, silent } }) => {
        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
        }

        return from(this.reportViewModelGeneratorService.get(id)).pipe(
          map(model => this.reportActions.setSelected(model)),
          catchError(error => {
            console.error('Error selecting report', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      }),
    );
  }, { dispatch: false });

  setSelected = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.setSelected),
      filter(({ payload: { selected } }) => !!selected),
      withLatestFrom(
        this.store.select(Selectors.getSelectMode),
        this.store.select(Selectors.getSelectedReport),
        this.store.select(Selectors.getSelectedReports),
      ),
      tap(([{ payload: { selected } }, selectMode, selectedReport, selectedReports]) => {
        const model = { ...selected };

        if (selectMode?.active) {
          const existing = selectedReports?.find(report => report?._id === model?.doc?._id);
          if (existing) {
            model.loading = false;
            this.reportActions.updateSelectedReportsItem(model._id, model);
          } else {
            model.expanded = false;
            this.reportActions.addSelectedReport(model);
          }
        } else {
          if (selectedReport?._id !== selected?.doc?._id) {
            this.reportActions.setVerifyingReport(false);
          }

          model.expanded = true;
          this.reportActions.setSelectedReport(model);
          this.reportActions.setTitle(model);
          this.reportActions.markReportRead(model?.doc?._id);
        }

        this.reportActions.setRightActionBar();
        this.globalActions.settingSelected();
      }),
    );
  }, { dispatch: false });

  setTitle = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.setTitle),
      withLatestFrom(this.store.select(Selectors.getForms)),
      exhaustMap(([{ payload: { selected } }, forms]) => {
        const formInternalId = selected?.formInternalId || selected?.doc?.form;
        const form = forms?.find(form => form.code === formInternalId);
        const name = form?.name || form?.title || formInternalId;
        return of(this.globalActions.setTitle(name));
      }),
    );
  }, { dispatch: false });

  markRead = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.markReportRead),
      concatMap(action => of(action).pipe(
        withLatestFrom(
          this.store.select(Selectors.getListReport, { id: action?.payload?.id }),
          this.store.select(Selectors.getUnreadCount),
        ),
      )),
      exhaustMap(([action, report, unreadCount]) => {
        if ((report && report.read) || !action?.payload?.id) {
          return of();
        }

        if (unreadCount) {
          this.globalActions.updateUnreadCount({ report: unreadCount.report - 1 });
        }

        // we could be reaching this effect before the list is loaded
        // in these cases, we skip updating the list and just update the database
        const readReport = report ? { ...report, read: true } : { _id: action?.payload?.id, form: true };
        this.markReadService
          .markAsRead([readReport])
          .catch(err => console.error('Error marking read', err));

        if (!report) {
          return of();
        }
        return of(this.reportActions.updateReportsList([readReport]));
      }),
    );
  }, { dispatch: false });

  private getContact(id) {
    return this.dbService
      .get()
      .get(id)
      .catch(err => {
        // log the error but continue anyway
        console.error('Error fetching contact for action bar', err);
      });
  }

  setRightActionBar = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.setRightActionBar),
      withLatestFrom(
        this.store.select(Selectors.getSelectMode),
        this.store.select(Selectors.getSelectedReportDoc),
        this.store.select(Selectors.getVerifyingReport),
      ),
      tap(([, selectMode, selectedReportDoc, verifyingReport ]) => {
        const model:any = {};
        const doc = !selectMode?.active && selectedReportDoc;
        if (!doc) {
          return this.globalActions.setRightActionBar(model);
        }

        model.verified = doc.verified;
        model.type = doc.content_type;
        model.verifyingReport = verifyingReport;
        const openSendMessageModal = (modalService:ModalService, sendTo) => {
          modalService
            .show(SendMessageComponent, { initialState: { fields: { to: sendTo } } })
            .catch(() => {});
        };
        model.openSendMessageModal = openSendMessageModal.bind({}, this.modalService);

        if (!doc.contact?._id) {
          return this.globalActions.setRightActionBar(model);
        }

        return this
          .getContact(doc.contact._id)
          .then(contact => {
            model.sendTo = contact;
            this.globalActions.setRightActionBar(model);
          });
      })
    );
  }, { dispatch: false });

  setSelectMode = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.setSelectMode),
      withLatestFrom(
        this.store.select(Selectors.getSelectMode),
        this.store.select(Selectors.getSelectedReports),
      ),
      tap(([, selectMode, selectedReports]) => {
        if (selectMode?.active && !selectedReports?.length) {
          this.globalActions.setSelectModeStatus({ active: false });
          return;
        }

        if (!selectMode?.active && selectedReports?.length >= 1) {
          this.globalActions.setSelectModeStatus({ active: true });
          this.globalActions.unsetSelected(true);
          this.router.navigate(['/reports']);
          return;
        }
      }),
    );
  }, { dispatch: false });

  selectAll = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.selectAll),
      withLatestFrom(this.store.select(Selectors.getFilters)),
      tap(([, filters]) => {
        return this.searchService
          .search('reports', filters, { limit: 500, hydrateContactNames: true })
          .then((summaries) => {
            const selected = summaries.map(summary => {
              return {
                _id: summary?._id,
                summary: summary,
                expanded: false,
                lineage: summary?.lineage,
                contact: summary?.contact,
              };
            });
            this.reportActions.setSelectedReports(selected);
            this.globalActions.settingSelected();
            this.reportActions.setRightActionBar();
            this.reportActions.setSelectMode();
          })
          .catch(err => {
            console.error('Error selecting all', err);
          });
      }),
    );
  }, { dispatch: false });

  launchEditFacilityDialog = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.launchEditFacilityDialog),
      withLatestFrom(this.store.select(Selectors.getSelectedReport)),
      tap(([, selectedReport]) => {
        this.modalService
          .show(EditReportComponent, { initialState: { model: { report: selectedReport?.doc } } })
          .catch(() => {});
      }),
    );
  }, { dispatch: false });

  verifyReport = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.verifyReport),
      withLatestFrom(this.store.select(Selectors.getSelectedReport)),
      tap(([{ payload: { verified } }, selectedReport]) => {
        // this was migrated from https://github.com/medic/cht-core/blob/3.10.x/webapp/src/js/actions/reports.js#L230
        // I've left the code largely unchanged in this migration, but we can improve this to:
        // - not have so many unnecessary interactions with the store
        // - update the properties of the fresh doc we get from the DB instead of using the stored doc and overwrite
        // and only keep the rev from the fresh doc
        // - don't update the state if saving fails!
        if (!selectedReport) {
          return;
        }

        this.globalActions.setLoadingSubActionBar(true);

        const promptUserToConfirmVerification = () => {
          const verificationTranslationKey = verified ? 'reports.verify.valid' : 'reports.verify.invalid';
          const proposedVerificationState = this.translateService.instant(verificationTranslationKey);
          return this.modalService
            .show(VerifyReportComponent, { initialState: { model: { proposedVerificationState } } })
            .then(() => true)
            .catch(() => false);
        };

        const shouldReportBeVerified = canUserEdit => {
          // verify if user verifications are allowed
          if (canUserEdit) {
            return true;
          }

          // don't verify if user can't edit and this is an edit
          const docHasExistingResult = selectedReport?.doc?.verified !== undefined;
          if (docHasExistingResult) {
            return false;
          }

          // verify if this is not an edit and the user accepts  prompt
          return promptUserToConfirmVerification();
        };

        const writeVerificationToDoc = report => {
          if (!report?.doc?._id) {
            return;
          }

          let verification;
          if (report.doc.verified === verified) {
            verification = { verified: undefined, verified_date: undefined };
          } else {
            verification = { verified, verified_date: Date.now() };
          }

          this.reportActions.setSelectedReportDocProperty(verification);
          this.servicesActions.setLastChangedDoc(report.doc);

          return this.dbService
            .get()
            .get(report.doc._id)
            .then(existingRecord => this.dbService.get().put({ ...existingRecord, ...verification }))
            .catch(err => console.error('Error verifying message', err))
            .finally(() => {
              const oldVerified = report.formatted?.verified;
              const newVerified = oldVerified === verified ? undefined : verified;
              this.reportActions.setSelectedReportFormattedProperty({ verified: newVerified, oldVerified });
              this.globalActions.setRightActionBarVerified(newVerified);
            });
        };

        return this.authService
          .has('can_edit_verification')
          .then(canUserEditVerifications => shouldReportBeVerified(canUserEditVerifications))
          .then(shouldVerify => {
            if (shouldVerify) {
              return writeVerificationToDoc(selectedReport);
            }
          })
          .catch(err => console.error('Error verifying message', err))
          .finally(() => this.globalActions.setLoadingSubActionBar(false));
      }),
    );
  }, { dispatch: false });
}
