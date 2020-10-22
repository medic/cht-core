import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';

import { Actions as GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';

@Injectable()
export class GlobalEffects {

  constructor(
    private actions$: Actions,
    private modalService: ModalService
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
}
