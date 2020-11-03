import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, tap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { select, Store } from '@ngrx/store';

import { Actions as GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { Actions as ReportActionList } from '@mm-actions/reports';
import { Selectors } from '@mm-selectors/index';


@Injectable()
export class GlobalEffects {

  constructor(
    private actions$: Actions,
    private modalService: ModalService,
    private store:Store,
  ) { }

  deleteDocConfirm$ = createEffect(
    ():any => this.actions$.pipe(
      ofType(GlobalActions.deleteDocConfirm),
      tap(({ payload: { doc } }) => {
        this.modalService.show(DeleteDocConfirmComponent, { initialState: { model: { doc } } });
      })
    ),
    { dispatch: false }
  );

  setTitle = createEffect(() => {
    return this.actions$.pipe(
      ofType(GlobalActions.navigationCancel),
      withLatestFrom(
        this.store.pipe(select(Selectors.getEnketoSavingStatus)),
        this.store.pipe(select(Selectors.getEnketoEditedStatus)),
        this.store.pipe(select(Selectors.getCancelCallback)),
      ),
      exhaustMap(([{ payload: { transition } }, enketoSaving, enketoEdited, cancelCallback]) => {
        if (enketoSaving) {
          // wait for save to finish
          return of();
        }

        if (!enketoEdited) {
          // form hasn't been modified - return immediately
          if (cancelCallback) {
            cancelCallback();
          }
          return of();
        }

        // otherwise data will be discarded so confirm navigation
        // TODO migrate Navigation confirm modal
        /* Modal({
          templateUrl: 'templates/modals/navigation_confirm.html',
          controller: 'NavigationConfirmCtrl',
          controllerAs: 'navigationConfirmCtrl',
        }).then(() => {
          setEnketoEditedStatus(false);
          if (transition) {
            return $state.go(transition.to, transition.params);
          }
          const cb = Selectors.getCancelCallback(getState());
          if (cb) {
            cb();
          }
        });*/
        // until navigation confirm modal is implemented, just cancelCallback
        if (cancelCallback) {
          cancelCallback();
        }
        return of();
      }),
    );
  }, { dispatch: false });
}
