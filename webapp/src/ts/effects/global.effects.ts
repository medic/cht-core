import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
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
  private renderer: Renderer2;
  private globalActions;

  constructor(
    private actions$: Actions,
    private modalService: ModalService,
    private store:Store,
    private router:Router,
    private rendererFactory:RendererFactory2
  ) {
    this.globalActions = new GlobalActions(store);
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  deleteDocConfirm$ = createEffect(
    ():any => this.actions$.pipe(
      ofType(GlobalActionsList.deleteDocConfirm),
      tap(({ payload: { doc } }) => {
        this.modalService
          .show(DeleteDocConfirmComponent, { initialState: { model: { doc } } })
          .catch(() => {});
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
      tap(([{ payload: { nextUrl } }, enketoSaving, enketoEdited, cancelCallback]) => {
        if (enketoSaving) {
          // wait for save to finish
          return;
        }

        if (!enketoEdited) {
          // form hasn't been modified - return immediately
          if (cancelCallback) {
            cancelCallback();
          }
          return;
        }

        this.modalService
          .show(NavigationConfirmComponent)
          .then(() => {
            this.globalActions.setEnketoEditedStatus(false);
            if (nextUrl) {
              this.router.navigate([nextUrl]);
              return;
            }

            if (cancelCallback) {
              cancelCallback();
            }
          })
          .catch(() => {});
      }),
    );
  }, { dispatch: false });
}
