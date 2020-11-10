import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, tap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { select, Store } from '@ngrx/store';

import { Actions as GlobalActionsList, GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { Selectors } from '@mm-selectors/index';

@Injectable()
export class GlobalEffects {
  private globalActions;

  constructor(
    private actions$: Actions,
    private modalService: ModalService,
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  deleteDocConfirm$ = createEffect(
    ():any => this.actions$.pipe(
      ofType(GlobalActionsList.deleteDocConfirm),
      tap(({ payload: { doc } }) => {
        this.modalService.show(DeleteDocConfirmComponent, { initialState: { model: { doc } } });
      })
    ),
    { dispatch: false }
  );

  navigationCancel = createEffect(() => {
    return this.actions$.pipe(
      ofType(GlobalActionsList.navigationCancel),
      withLatestFrom(
        this.store.pipe(select(Selectors.getEnketoSavingStatus)),
        this.store.pipe(select(Selectors.getEnketoEditedStatus)),
        this.store.pipe(select(Selectors.getCancelCallback)),
      ),
      exhaustMap(([{ payload: { nextUrl } }, enketoSaving, enketoEdited, cancelCallback]) => {
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

        // todo this will be added in the next PR
        /*this.modalService.show(
          NavigationConfirmComponent,
          {
            initialState: {
              callback: () => {
                this.globalActions.setEnketoEditedStatus(false);
                if (nextUrl) {
                  this.router.navigate([nextUrl]);
                  return;
                }

                if (cancelCallback) {
                  cancelCallback();
                }
              }
            }
          }
        );*/

        // this part is temporary while above section is commented
        if (cancelCallback) {
          cancelCallback();
        }
        return of();
      }),
    );
  }, { dispatch: false });
}
