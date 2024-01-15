import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed, waitForAsync, fakeAsync, flush } from '@angular/core/testing';
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
import { ModalService } from '@mm-services/modal.service';
import { DeleteDocConfirmComponent } from '@mm-modals/delete-doc-confirm/delete-doc-confirm.component';
import { NavigationConfirmComponent } from '@mm-modals/navigation-confirm/navigation-confirm.component';

describe('GlobalEffects', () => {
  let effects:GlobalEffects;
  let actions$;
  let modalService;
  let toPromiseStub;
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

    toPromiseStub = sinon.stub();
    modalService = {
      show: sinon
        .stub()
        .returns({
          afterClosed: () => ({ toPromise: toPromiseStub }),
        }),
    };

    router = {
      navigateByUrl: sinon.stub(),
    };

    initialModalState = { messageTranslationKey: undefined, telemetryEntry: undefined };
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
      expect(modalService.show.notCalled).to.be.true;
    }));

    it('should open modal with payload', waitForAsync(() => {
      const doc = { _id: 'some_doc' };
      actions$ = of(GlobalActionsList.deleteDocConfirm(doc));
      effects.deleteDocConfirm$.subscribe();
      expect(modalService.show.calledOnce).to.be.true;
      expect(modalService.show.args[0]).to.deep.equal([ DeleteDocConfirmComponent, { data: { doc } }]);
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

      it('when not saving edited and no cancel callback and no route', fakeAsync(() => {
        toPromiseStub.resolves(true);
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: true });
        actions$ = of(GlobalActionsList.navigationCancel(''));
        effects.navigationCancel.subscribe();

        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, { data: initialModalState }]);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

        expect(router.navigateByUrl.callCount).to.equal(0);
      }));

      it('when not saving edited and no cancel callback and route', fakeAsync(() => {
        toPromiseStub.resolves(true);
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: true });
        actions$ = of(GlobalActionsList.navigationCancel('next'));
        effects.navigationCancel.subscribe();

        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, { data: initialModalState }]);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

        expect(router.navigateByUrl.calledOnce).to.be.true;
        expect(router.navigateByUrl.args[0]).to.deep.equal([ 'next' ]);
      }));

      it('when not saving edited and cancel callback but user cancels modal', fakeAsync(() => {
        toPromiseStub.resolves(false);
        store.overrideSelector(Selectors.getNavigation, { cancelCallback });
        store.overrideSelector(Selectors.getEnketoStatus, { form: true, saving: false, edited: true });
        actions$ = of(GlobalActionsList.navigationCancel(''));

        effects.navigationCancel.subscribe();

        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, { data: initialModalState }]);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

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

      it('when navigation is prevented and user cancels modal', fakeAsync(() => {
        toPromiseStub.resolves(false);
        store.overrideSelector(Selectors.getNavigation, { cancelCallback, preventNavigation: true });
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, { data: initialModalState }]);
      }));

      it('when navigation is prevented and user confirms modal with route', fakeAsync(() => {
        toPromiseStub.resolves(true);
        store.overrideSelector(Selectors.getNavigation, { cancelCallback, preventNavigation: true });
        actions$ = of(GlobalActionsList.navigationCancel('path'));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, { data: initialModalState }]);

        flush();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(1);
        expect(router.navigateByUrl.args[0]).to.deep.equal(['path']);

      }));

      it('when navigation is prevented and user confirms modal without route', fakeAsync(() => {
        toPromiseStub.resolves(true);
        store.overrideSelector(Selectors.getNavigation, { cancelCallback, preventNavigation: true });
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

        expect(cancelCallback.callCount).to.equal(1);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([NavigationConfirmComponent, { data: initialModalState }]);
      }));

      it('should pass message translation key to modal', fakeAsync(() => {
        toPromiseStub.resolves(false);
        const nav = {
          cancelCallback,
          preventNavigation: true,
          cancelTranslationKey: 'somekey',
        };
        store.overrideSelector(Selectors.getNavigation, nav);
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0][1]).to.deep.equal({
          data: {
            messageTranslationKey: 'somekey',
            telemetryEntry: undefined,
          },
        });
      }));

      it('should pass whether to record telemetry to modal', fakeAsync(() => {
        toPromiseStub.resolves(false);
        const nav = {
          cancelCallback,
          preventNavigation: true,
          cancelTranslationKey: 'somekey',
          recordTelemetry: 'someEntry',
        };
        store.overrideSelector(Selectors.getNavigation, nav);
        actions$ = of(GlobalActionsList.navigationCancel(null));
        effects.navigationCancel.subscribe();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);

        flush();

        expect(cancelCallback.callCount).to.equal(0);
        expect(router.navigateByUrl.callCount).to.equal(0);
        expect(modalService.show.callCount).to.equal(1);
        expect(modalService.show.args[0]).to.deep.equal([
          NavigationConfirmComponent,
          {
            data: {
              messageTranslationKey: 'somekey',
              telemetryEntry: 'someEntry',
            },
          },
        ]);
      }));
    });
  });
});
