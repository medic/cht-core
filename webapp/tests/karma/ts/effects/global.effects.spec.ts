import { provideMockActions } from '@ngrx/effects/testing';
import { async, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { Action } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { GlobalEffects } from '@mm-effects/global.effects';
import { Selectors } from '@mm-selectors/index';
import { Actions as GlobalActionsList, GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { Actions as ReportActionList } from '@mm-actions/reports';
import { setOffsetToParsedOffset } from 'ngx-bootstrap/chronos/units/offset';

describe('GlobalEffects', () => {
  let effects:GlobalEffects;
  let actions$;
  let modalService;
  let store;

  beforeEach(async(() => {
    actions$ = new Observable<Action>();
    let mockedSelectors = [
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoEditedStatus, value: false },
      { selector: Selectors.getCancelCallback, value: undefined },
    ];

    modalService = {
      show: sinon.stub(),
    };

    TestBed.configureTestingModule({
      imports: [
        EffectsModule.forRoot([GlobalEffects]),
      ],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ModalService, useValue: modalService },
      ],
    });

    effects = TestBed.inject(GlobalEffects);
    store = TestBed.inject(MockStore);
  }));

  afterEach(() => {
    sinon.restore();
  });

  describe('deleteDocConfirm', () => {
    it('should not be triggered by random actions', async (() => {
      actions$ = of([
        GlobalActionsList.setLoadingContent(true),
        GlobalActionsList.clearSelected(),
        GlobalActionsList.setFilter({}),
      ]);
      effects.deleteDocConfirm$.subscribe();
      expect(modalService.show.callCount).to.equal(0);
    }));

    it('should open modal with payload', async (() => {
      const doc = { _id: 'some_doc' };
      actions$ = of(GlobalActionsList.deleteDocConfirm(doc));
      effects.deleteDocConfirm$.subscribe();
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        DeleteDocConfirmComponent,
        { initialState: { model: { doc } } },
      ]);
    }));
  });

  describe('navigationCancel', () => {
    it('when saving, do nothing', async(() => {
      const callback = sinon.stub();
      store.overrideSelector(Selectors.getEnketoSavingStatus, true);
      store.overrideSelector(Selectors.getCancelCallback, callback);

      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      expect(callback.callCount).to.equal(0);
      // todo add assertion that modal service was not called once the modal is migrated
    }));

    it('when not saving and not edited and no cancelCallback', async(() => {
      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      // todo add assertion that modal service was not called once the modal is migrated
    }));

    it('when not saving edited and no cancel callback', async (() => {
      store.overrideSelector(Selectors.getEnketoEditedStatus, true);
      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      // todo add assertion that modal service was not called once the modal is migrated
    }));

    it('when not saving, not edited and cancelCallback ', async(() => {
      const callback = sinon.stub();
      store.overrideSelector(Selectors.getCancelCallback, callback);
      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      expect(callback.callCount).to.equal(1);
      expect(callback.args[0]).to.deep.equal([]);
      // todo add assertion that modal service was not called once the modal is migrated
    }));
  });
});
