import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
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

const nextTick = () => new Promise(r => setTimeout(r));

describe('GlobalEffects', () => {
  let effects:GlobalEffects;
  let actions$;
  let modalService;
  let store;
  let router;
  let initialModalState;
  let cancelCallback;

  beforeEach(waitForAsync(() => {
    actions$ = new Observable<Action>();
    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: { error: false, saving: false, form: false, edited: false } },
      { selector: Selectors.getNavigation, value: { cancelCallback: undefined } },
    ];

    modalService = {
      show: sinon.stub().resolves(),
    };

    router = {
      navigateByUrl: sinon.stub(),
    };

    initialModalState = { initialState: { messageTranslationKey: undefined, telemetryEntry: undefined } };
    cancelCallback = sinon.stub();

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
    store.resetSelectors();
    sinon.restore();
  });

  describe('deleteDocConfirm', () => {
    it('should not be triggered by random actions', waitForAsync(() => {
      actions$ = of([
        GlobalActionsList.setLoadingContent(true),
        GlobalActionsList.clearSelected(),
        GlobalActionsList.setFilter({}),
      ]);
      effects.deleteDocConfirm$.subscribe();
      expect(modalService.show.callCount).to.equal(0);
    }));

    it('should open modal with payload', waitForAsync(() => {
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
    describe('for enketo forms', () => {
      it('when saving, do nothing', waitForAsync(() => {
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: true, edited: true });
        store.overrideSelector(Selectors.getNavigation, { cancelCallback });

        actions$ = of(GlobalActionsList.navigationCancel('next'));
        effects.navigationCancel.subscribe();
        expect(cancelCallback.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
      }));

      it('when not saving and not edited and no cancelCallback', waitForAsync(async () => {
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: false });
        actions$ = of(GlobalActionsList.navigationCancel('next'));
        effects.navigationCancel.subscribe();
        expect(modalService.show.callCount).to.equal(0);
        await Promise.resolve(); // wait for modalService to resolve: means user clicks to confirm navigation
        expect(router.navigateByUrl.callCount).to.equal(1);
        expect(router.navigateByUrl.args[0]).to.deep.equal(['next']);
      }));

      it('when not saving edited and no cancel callback and no route', waitForAsync(async () => {
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: true });
        actions$ = of(GlobalActionsList.navigationCancel(''));
        effects.navigationCancel.subscribe();
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, initialModalState]);
        expect(router.navigateByUrl.callCount).to.equal(0);
        await Promise.resolve(); // wait for modalService to resolve: means user clicks to confirm navigation
        expect(router.navigateByUrl.callCount).to.equal(0);
      }));

      it('when not saving edited and no cancel callback and route', waitForAsync(async () => {
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: true });
        actions$ = of(GlobalActionsList.navigationCancel('next'));
        effects.navigationCancel.subscribe();
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, initialModalState]);
        expect(router.navigateByUrl.callCount).to.equal(0);
        await Promise.resolve(); // wait for modalService to resolve: means user clicks to confirm navigation
        expect(router.navigateByUrl.callCount).to.equal(0);
      }));

      it('when not saving edited and cancel callback but user cancels modal', waitForAsync(async () => {
        modalService.show.rejects({ means: 'that user cancelled' });
        store.overrideSelector(Selectors.getNavigation, { cancelCallback });
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: true });
        actions$ = of(GlobalActionsList.navigationCancel(''));
        effects.navigationCancel.subscribe();
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, initialModalState]);
        expect(router.navigateByUrl.callCount).to.equal(0);
        await Promise.resolve(); // wait for modalService to reject: means user clicks to cancel navigation
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(cancelCallback.callCount).to.equal(0);
      }));

      it('when not saving, not edited and cancelCallback ', waitForAsync(async () => {
        store.overrideSelector(Selectors.getEnketoStatus, { form: true });
        store.overrideSelector(Selectors.getNavigation, { cancelCallback });
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();
        expect(cancelCallback.callCount).to.equal(1);
        expect(cancelCallback.args[0]).to.deep.equal([]);
        expect(modalService.show.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
      }));
    });

    describe('for regular pages', () => {
      it('when navigation is not prevented and with route', waitForAsync(() => {
        store.overrideSelector(Selectors.getNavigation, { cancelCallback });
        actions$ = of(GlobalActionsList.navigationCancel('route'));
        effects.navigationCancel.subscribe();
        expect(cancelCallback.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(1);
        expect(router.navigateByUrl.args[0]).to.deep.equal(['route']);
      }));

      it('when navigation is not prevented and no route', waitForAsync(() => {
        store.overrideSelector(Selectors.getNavigation, { cancelCallback });
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();
        expect(cancelCallback.callCount).to.equal(1);
        expect(cancelCallback.args[0]).to.deep.equal([]);
        expect(modalService.show.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
      }));

      it('when navigation is not prevented and no route and no cancel callback', waitForAsync(() => {
        store.overrideSelector(Selectors.getNavigation, { });
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();
        expect(cancelCallback.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
      }));

      it('when navigation is prevented and user cancels modal', waitForAsync(async () => {
        store.overrideSelector(Selectors.getNavigation, { cancelCallback, preventNavigation: true });
        modalService.show.rejects();
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        await Promise.resolve(); // wait for modal cancel

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, initialModalState]);
      }));

      it('when navigation is prevented and user confirms modal with route', waitForAsync(async () => {
        store.overrideSelector(Selectors.getNavigation, { cancelCallback, preventNavigation: true });
        modalService.show.resolves();
        actions$ = of(GlobalActionsList.navigationCancel('path'));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, initialModalState]);

        await nextTick(); // wait for modal confirm

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(1);
        expect(router.navigateByUrl.args[0]).to.deep.equal(['path']);

      }));

      it('when navigation is prevented and user confirms modal without route', waitForAsync(async () => {
        store.overrideSelector(Selectors.getNavigation, { cancelCallback, preventNavigation: true });
        modalService.show.resolves();
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        await nextTick(); // wait for modal confirm

        expect(cancelCallback.callCount).to.equal(1);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, initialModalState]);
      }));

      it('should pass message translation key to modal', waitForAsync(async () => {
        const nav = {
          cancelCallback,
          preventNavigation: true,
          cancelTranslationKey: 'somekey',
        };
        store.overrideSelector(Selectors.getNavigation, nav);
        modalService.show.rejects();
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        await nextTick();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0][1]).to.deep.equal({
          initialState: {
            messageTranslationKey: 'somekey',
            telemetryEntry: undefined,
          },
        });
      }));

      it('should pass whether to record telemetry to modal', waitForAsync(async () => {
        const nav = {
          cancelCallback,
          preventNavigation: true,
          cancelTranslationKey: 'somekey',
          recordTelemetry: 'someEntry',
        };
        store.overrideSelector(Selectors.getNavigation, nav);
        modalService.show.rejects();
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        await Promise.resolve(); // wait for modal confirm

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([
          NavigationConfirmComponent,
          {
            initialState: {
              messageTranslationKey: 'somekey',
              telemetryEntry: 'someEntry',
            },
          },
        ]);
      }));
    });
  });
});
