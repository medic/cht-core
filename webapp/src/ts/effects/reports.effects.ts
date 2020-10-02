import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Actions, ofType, createEffect, act } from '@ngrx/effects';
import { Actions as ReportActionList, ReportsActions } from '@mm-actions/reports';
import { Actions as GlobalActionList, GlobalActions } from '@mm-actions/global';
import { combineLatest, forkJoin, from, of } from 'rxjs';
import { map, exhaustMap, filter, catchError, concatMap, tap, withLatestFrom } from 'rxjs/operators';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { Selectors } from '@mm-selectors/index';


@Injectable()
export class ReportsEffects {
  private reportActions;
  private globalActions;

  constructor(
    private actions$:Actions,
    private store:Store,
    private reportViewModelGeneratorService:ReportViewModelGeneratorService,
  ) {
    this.reportActions = new ReportsActions(store);
    this.globalActions = new GlobalActions(store);
  }

  selectReport = createEffect(() => {
    console.log('in select report effect');
    return this.actions$.pipe(
      tap(() => console.log('filtering selectReport')),
      ofType(ReportActionList.selectReport),
      tap(() => console.log('got selectReport')),
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
    console.log('in set selected effect');
    return this.actions$.pipe(
      tap(() => console.log('filtering setSelected')),
      ofType(ReportActionList.setSelected),
      tap(() => console.log('got setSelected')),
      concatMap(action => combineLatest(
        of(action),
        this.store.pipe(select(Selectors.getSelectMode)),
        this.store.pipe(select(Selectors.getSelectedReports)),
      )),
      exhaustMap(([{ payload: { model } }, selectMode, selectedReports]) => {
        console.log('aiiiiici???');
        let refreshing = true;

        if (selectMode) {
          const existing  = selectedReports?.find(report => report._id === model.doc._id);
          if (existing) {
            Object.assign(existing, model);
          } else {
            model.expanded = false;
            this.reportActions.addSelectedReport(model);
          }
        } else {
          refreshing =
            model.doc &&
            selectedReports.length &&
            selectedReports[0]._id === model.doc._id;
          if (!refreshing) {
            this.reportActions.setVerifyingReport(false);
          }

          model.expanded = true;
          this.reportActions.setSelectedReports([model]);
          this.reportActions.setTitle(model);
          // todo mark report as read
        }

        this.reportActions.setRightActionBar();
        return of(this.globalActions.settingSelected(refreshing));
      }),
    );
  }, { dispatch: false });
}
