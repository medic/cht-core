import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { map, exhaustMap, filter, catchError, withLatestFrom, concatMap, tap } from 'rxjs/operators';

import { Actions as ReportActionList, ReportsActions } from '@mm-actions/reports';
import { GlobalActions } from '@mm-actions/global';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { Selectors } from '@mm-selectors/index';
import { MarkReadService } from '@mm-services/mark-read.service';


@Injectable()
export class ReportsEffects {
  private reportActions;
  private globalActions;

  constructor(
    private actions$:Actions,
    private store:Store,
    private reportViewModelGeneratorService:ReportViewModelGeneratorService,
    private markReadService:MarkReadService,
  ) {
    this.reportActions = new ReportsActions(store);
    this.globalActions = new GlobalActions(store);
  }

  selectReport = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.selectReport),
      filter(({ payload: { id } }) => !!id),
      exhaustMap(({ payload: { id, silent } }) => {
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
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectMode)),
        this.store.pipe(select(Selectors.getSelectedReports))
      ),
      exhaustMap(([{ payload: { selected } }, selectMode, selectedReports]) => {
        const model = { ...selected };
        let refreshing = true;

        if (selectMode) {
          const existing = selectedReports?.find(report => report?._id === model?.doc?._id);
          if (existing) {
            // todo update selected report in selectMode
            // this.reportActions.updateSelectedReport(model);
          } else {
            model.expanded = false;
            this.reportActions.addSelectedReport(model);
          }
        } else {
          refreshing =
            selected.doc &&
            selectedReports?.length &&
            selectedReports[0]._id === selected?.doc?._id;
          if (!refreshing) {
            this.reportActions.setVerifyingReport(false);
          }

          model.expanded = true;
          this.reportActions.setSelectedReports([model]);
          this.reportActions.setTitle(model);
          this.reportActions.markReportRead(model?.doc?._id);
        }

        this.reportActions.setRightActionBar();
        return of(this.globalActions.settingSelected(refreshing));
      }),
    );
  }, { dispatch: false });

  setTitle = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActionList.setTitle),
      withLatestFrom(this.store.pipe(select(Selectors.getForms))),
      exhaustMap(([{ payload: { selected } }, forms]) => {
        const formInternalId = selected?.doc?.formInternalId || selected?.doc?.form;
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
        withLatestFrom(this.store.select(Selectors.getListReport, { id: action?.payload?.id })),
      )),
      exhaustMap(([action, report]) => {
        const readReport = { ...report };
        readReport.read = true;
        this.markReadService
          .markAsRead([report])
          .catch(err => console.error('Error marking read', err));
        return of(this.reportActions.updateReportsList([readReport]));
      }),
    );
  }, { dispatch: false });
}
