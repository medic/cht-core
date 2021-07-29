import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, withLatestFrom } from 'rxjs/operators';
import { select, Store } from '@ngrx/store';
import { Router } from '@angular/router';

import { Actions as GlobalActionsList, GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { Selectors } from '@mm-selectors/index';
import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';


@Injectable()
export class GlobalEffects {
  private globalActions;

  constructor(
    private actions$: Actions,
    private modalService: ModalService,
    private store:Store,
    private router:Router,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  deleteDocConfirm$ = createEffect(
    ():any => this.actions$.pipe(
      ofType(GlobalActionsList.deleteDocConfirm),
      tap(({ payload: { doc } }) => {
        this.modalService
          .show(DeleteDocConfirmComponent, { initialState: { model: { doc } } })
          .catch(() => {});
      }),
    ),
    { dispatch: false }
  );

  private cancelFormSubmission(nextUrl, enketoStatus, navigationStatus) {
    if (enketoStatus.saving) {
      // wait for save to finish
      return;
    }

    if (!enketoStatus.edited) {
      // form hasn't been modified - return immediately
      this.navigate(null, navigationStatus.cancelCallback);
      return;
    }

    return this
      .showModal(navigationStatus.cancelMessage)
      .then(confirm => {
        if (!confirm) {
          return;
        }

        this.globalActions.setEnketoEditedStatus(false);
        this.navigate(nextUrl, navigationStatus.cancelCallback);
      });
  }

  private showModal(cancelMessage) {
    return this.modalService
      .show(NavigationConfirmComponent, { initialState: { model: { cancelMessage }} })
      .then(() => true)
      .catch(() => false);
  }

  private navigate(nextUrl, cancelCallback) {
    try {
      if (nextUrl) {
        this.router.navigate([nextUrl]);
        return;
      }

      if (cancelCallback) {
        cancelCallback();
      }
    } catch (err) {
      console.error('Error during navigation cancel', err);
    }
  }

  navigationCancel = createEffect(() => {
    return this.actions$.pipe(
      ofType(GlobalActionsList.navigationCancel),
      withLatestFrom(
        this.store.pipe(select(Selectors.getEnketoStatus)),
        this.store.pipe(select(Selectors.getNavigation)),
      ),
      tap(([{ payload: { nextUrl } }, enketoStatus, navigationStatus]) => {
        console.error(enketoStatus);
        if (enketoStatus.form) {
          return this.cancelFormSubmission(nextUrl, enketoStatus, navigationStatus);
        }

        if (!navigationStatus.preventNavigation) {
          this.navigate(null, navigationStatus.cancelCallback);
        }

        return this
          .showModal(navigationStatus.cancelMessage)
          .then(confirm => {
            if (!confirm) {
              return;
            }
            this.globalActions.setNavigation({ preventNavigation: false });
            this.navigate(nextUrl, navigationStatus.cancelCallback);
          });
      }),
    );
  }, { dispatch: false });
}
