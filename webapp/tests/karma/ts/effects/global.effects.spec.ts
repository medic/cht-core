import { provideMockActions } from '@ngrx/effects/testing';
import { async, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { Action } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { Router } from '@angular/router';

import { GlobalEffects } from '@mm-effects/global.effects';
import { Selectors } from '@mm-selectors/index';
import { Actions as GlobalActionsList } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';

describe('GlobalEffects', () => {
  let effects:GlobalEffects;
  let actions$;
  let modalService;
  let store;
  let router;

  beforeEach(async(() => {
    actions$ = new Observable<Action>();
    const mockedSelectors = [
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoEditedStatus, value: false },
      { selector: Selectors.getCancelCallback, value: undefined },
    ];

    modalService = {
      show: sinon.stub().resolves(),
    };

    router = {
      navigate: sinon.stub(),
    };

    TestBed.configureTestingModule({
      declarations: [
        NavigationConfirmComponent,
      ],
      imports: [
        EffectsModule.forRoot([GlobalEffects]),
      ],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ModalService, useValue: modalService },
        { provide: Router, useValue: router },
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
      expect(modalService.show.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
    }));

    it('when not saving and not edited and no cancelCallback', async(async () => {
      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      expect(modalService.show.callCount).to.equal(0);
      await Promise.resolve(); // wait for modalService to resolve: means user clicks to confirm navigation
      expect(router.navigate.callCount).to.equal(0);
    }));

    it('when not saving edited and no cancel callback and no route', async (async () => {
      store.overrideSelector(Selectors.getEnketoEditedStatus, true);
      actions$ = of(GlobalActionsList.navigationCancel(''));
      effects.navigationCancel.subscribe();
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent]);
      expect(router.navigate.callCount).to.equal(0);
      await Promise.resolve(); // wait for modalService to resolve: means user clicks to confirm navigation
      expect(router.navigate.callCount).to.equal(0);
    }));

    it('when not saving edited and no cancel callback and route', async (async () => {
      store.overrideSelector(Selectors.getEnketoEditedStatus, true);
      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent]);
      expect(router.navigate.callCount).to.equal(0);
      await Promise.resolve(); // wait for modalService to resolve: means user clicks to confirm navigation
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['next']]);
    }));

    it('when not saving edited and cancel callback but user cancels modal', async (async () => {
      const cancelCallback = sinon.stub();
      modalService.show.rejects({ means: 'that user cancelled' });
      store.overrideSelector(Selectors.getCancelCallback, cancelCallback);
      store.overrideSelector(Selectors.getEnketoEditedStatus, true);
      actions$ = of(GlobalActionsList.navigationCancel(''));
      effects.navigationCancel.subscribe();
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent]);
      expect(router.navigate.callCount).to.equal(0);
      await Promise.resolve(); // wait for modalService to reject: means user clicks to cancel navigation
      expect(router.navigate.callCount).to.equal(0);
      expect(cancelCallback.callCount).to.equal(0);
    }));

    it('when not saving, not edited and cancelCallback ', async(async () => {
      const cancelCallback = sinon.stub();
      store.overrideSelector(Selectors.getCancelCallback, cancelCallback);
      actions$ = of(GlobalActionsList.navigationCancel('next'));
      effects.navigationCancel.subscribe();
      expect(cancelCallback.callCount).to.equal(1);
      expect(cancelCallback.args[0]).to.deep.equal([]);
      expect(modalService.show.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
    }));
  });
});
