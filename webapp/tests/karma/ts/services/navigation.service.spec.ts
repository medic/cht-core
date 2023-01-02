import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { expect } from 'chai';
import sinon from 'sinon';

import { NavigationService } from '@mm-services/navigation.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { Selectors } from '@mm-selectors/index';

describe('NavigationService', () => {
  let service: NavigationService;
  let consoleErrorMock;
  let headerTabsService;
  let store;
  let router;

  beforeEach(() => {
    router = {
      navigate: sinon.stub(),
      routerState: {
        root: { snapshot: { } }
      }
    };

    const mockedSelectors = [
      { selector: Selectors.getCurrentTab, value: null },
    ];

    headerTabsService = { getPrimaryTab: sinon.stub().resolves() };

    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: HeaderTabsService, useValue: headerTabsService },
        { provide: Router, useValue: router },
      ]
    });

    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  describe('goBack()', () => {
    it('should navigate to contacts from deceased', () => {
      router.routerState.root.snapshot = {
        data: { name: 'contacts.deceased' },
        params: { id: 'my-contact-id' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'my-contact-id']]);
    });

    it('should navigate to contacts from contact detail', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'contacts' } },
          ]
        },
        params: { id: 'my-contact-id' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'contacts']]);
    });

    it('should navigate to reports from report detail', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'reports' } },
          ]
        },
        params: { id: 'my-report-id' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'reports']]);
    });

    it('should navigate to parent route from child route with id', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'something' } },
          ]
        },
        params: { id: 'my-random-id' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'something']]);
    });

    it('should navigate to parent route from child route with type_id', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'fav-movies' } },
          ]
        },
        params: { type_id: 'sci-fi:the-martian' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'fav-movies']]);
    });

    it('should navigate to parent from child with id when the routing has multiple levels', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'analytics' } },
            { routeConfig: { path: 'target-aggregates' } },
          ]
        },
        params: { id: '12345' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'analytics', 'target-aggregates']]);
    });

    it('should navigate to parent from child with type_id when the routing has multiple levels', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'level-a' } },
            { routeConfig: { path: 'level-b' } },
            { routeConfig: { path: 'level-c' } },
          ]
        },
        params: { type_id: 'a-type:an-id' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/', 'level-a', 'level-b', 'level-c']]);
    });

    it('should log error and return false when route snapshot is missing', () => {
      router.routerState.root.snapshot = null;
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.false;
      expect(router.navigate.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'NavigationService :: Cannot navigate back, routeSnapshot is undefined.'
      ]);
    });

    it('should log error and return false when cannot determine path to navigate', () => {
      router.routerState.root.snapshot = {
        parent: { pathFromRoot: null },
        params: { id: 'my-contact-id' },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.false;
      expect(router.navigate.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'NavigationService :: Cannot determine path to navigate back'
      ]);
    });

    it('should return false when route doesnt have params and data', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'contacts' } },
          ]
        },
        params: null,
        data: null,
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.false;
      expect(router.navigate.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(0);
    });

    it('should return false when route have unrecognized params and data', () => {
      router.routerState.root.snapshot = {
        parent: {
          pathFromRoot: [
            { routeConfig: null },
            { routeConfig: { path: 'contacts' } },
          ]
        },
        params: { anything: 123 },
        data: { random: 4 },
      };
      service = TestBed.inject(NavigationService);

      const result = service.goBack();

      expect(result).to.be.false;
      expect(router.navigate.callCount).to.equal(0);
      expect(consoleErrorMock.callCount).to.equal(0);
    });
  });

  describe('goToPrimaryTab()', () => {
    it('should navigate to primaryTab if it is not the current tab', fakeAsync(() => {
      store.overrideSelector(Selectors.getCurrentTab, 'tasks');
      store.refreshState();
      headerTabsService.getPrimaryTab.resolves({ name: 'messages', route: 'messages' });
      service = TestBed.inject(NavigationService);
      tick();

      const result = service.goToPrimaryTab();

      expect(result).to.be.true;
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([ ['messages'] ]);
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(headerTabsService.getPrimaryTab.callCount).to.equal(1);
    }));

    it('should return false and log error if route is missing', fakeAsync(() => {
      store.overrideSelector(Selectors.getCurrentTab, 'tasks');
      store.refreshState();
      headerTabsService.getPrimaryTab.resolves({ name: 'messages', route: null });
      service = TestBed.inject(NavigationService);
      tick();

      const result = service.goToPrimaryTab();

      expect(result).to.be.false;
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'NavigationService :: Cannot navigate to primary tab, route is undefined.'
      ]);
      expect(headerTabsService.getPrimaryTab.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(0);
    }));

    it('should return false if primaryTab is the current tab', fakeAsync(() => {
      store.overrideSelector(Selectors.getCurrentTab, 'messages');
      store.refreshState();
      headerTabsService.getPrimaryTab.resolves({ name: 'messages', route: 'messages' });
      service = TestBed.inject(NavigationService);
      tick();

      const result = service.goToPrimaryTab();

      expect(result).to.be.false;
      expect(consoleErrorMock.callCount).to.equal(0);
      expect(headerTabsService.getPrimaryTab.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(0);
    }));
  });
});
