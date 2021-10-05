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
      this.navigate(nextUrl, navigationStatus.cancelCallback);
      return;
    }

    return this
      .showModal(navigationStatus)
      .then(confirm => {
        if (!confirm) {
          return;
        }

        this.globalActions.setEnketoEditedStatus(false);
        this.navigate(nextUrl, navigationStatus.cancelCallback);
      });
  }

  private showModal({ cancelTranslationKey, recordTelemetry }) {
    const modalInitialState = {
      messageTranslationKey: cancelTranslationKey,
      telemetryEntry: recordTelemetry,
    };

    return this.modalService
      .show(NavigationConfirmComponent, { initialState: modalInitialState })
      .then(() => true)
      .catch(() => false);
  }

  private navigate(nextUrl: string, cancelCallback: () => void) {
    try {
      if (nextUrl) {
        return this.router.navigateByUrl(nextUrl);
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
        if (enketoStatus.form) {
          return this.cancelFormSubmission(nextUrl, enketoStatus, navigationStatus);
        }

        if (!navigationStatus.preventNavigation) {
          return this.navigate(nextUrl, navigationStatus.cancelCallback);
        }

        return this
          .showModal(navigationStatus)
          .then(confirm => {
            if (!confirm) {
              return;
            }
            this.globalActions.setPreventNavigation(false);
            return this.navigate(nextUrl, navigationStatus.cancelCallback);
          });
      }),
    );
  }, { dispatch: false });
}
