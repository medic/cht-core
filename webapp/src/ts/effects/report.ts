import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { Actions as ReportActionList, ReportsActions } from '@mm-actions/reports';
import { Actions as GlobalActionList, GlobalActions } from '@mm-actions/global';
import { from } from 'rxjs';
import { tap, concatMap, withLatestFrom, exhaustMap, filter } from 'rxjs/operators';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';

@Injectable()
export class ReportEffects {
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
    return this.actions$.pipe(
      ofType(ReportActionList.selectReport),
      filter(({ payload: { id } }) => !!id),
      exhaustMap(({ payload: { id, silent } }) => {
        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
        }

        return from(this.reportViewModelGeneratorService)
      })
    )
  }, { dispatch: false });
}
