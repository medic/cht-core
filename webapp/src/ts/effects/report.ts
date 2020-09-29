import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { Actions as ReportActions } from '../actions/reports';
import { tap, concatMap, withLatestFrom } from 'rxjs/operators';

@Injectable()
export class ReportEffects {
  constructor(
    private actions$:Actions,
    private store:Store,
  ) {
  }

  selectReport = createEffect(() => {
    return this.actions$.pipe(
      ofType(ReportActions.selectReport),

    )
  });
}
