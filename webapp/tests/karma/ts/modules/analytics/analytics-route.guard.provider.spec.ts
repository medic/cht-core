import { ActivatedRouteSnapshot } from '@angular/router';
import { fakeAsync, flush, waitForAsync } from '@angular/core/testing';
import { Subject } from 'rxjs';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { AnalyticsRouteGuardProvider } from '@mm-modules/analytics/analytics-route.guard.provider';
import { Selectors } from '@mm-selectors/index';

describe('AnalyticsRouteGuard provider', () => {
  let provider: AnalyticsRouteGuardProvider;
  let store;
  let router;

  beforeEach(() => {
    store = { select: sinon.stub() };
    router = { createUrlTree: sinon.stub() };
    provider = new AnalyticsRouteGuardProvider(store, router);
  });

  afterEach(() => sinon.restore());

  it('should return module path if single module is present', waitForAsync(() => {
    const route = new ActivatedRouteSnapshot();
    route.data = { tab: 'analytics' };
    const subject = new Subject();
    store.select.returns(subject);
    router.createUrlTree.returnsArg(0);

    provider
      .canActivateChild(route)
      .subscribe(result => {
        expect(result).to.deep.equal([ '/', 'analytics', 'targets' ]);
        expect(router.createUrlTree.callCount).to.equal(1);
        expect(router.createUrlTree.args[0]).to.deep.equal([[ '/', 'analytics', 'targets' ]]);
      });

    subject.next([ { id: 'targets', route: ['/', 'analytics', 'targets'] } ]);

    expect(store.select.callCount).to.equal(1);
    expect(store.select.args[0]).to.deep.equal([Selectors.getAnalyticsModules]);
  }));

  it('should return true and not module path if multiple modules are present', waitForAsync(() => {
    const route = new ActivatedRouteSnapshot();
    route.data = { tab: 'analytics' };
    const subject = new Subject();
    store.select.returns(subject);
    router.createUrlTree.returnsArg(0);

    provider
      .canActivateChild(route)
      .subscribe(result => {
        expect(result).to.be.true;
        expect(router.createUrlTree.callCount).to.equal(0);
      });

    subject.next([
      { id: 'target-aggregates', route: ['/', 'analytics', 'target-aggregates'] },
      { id: 'targets', route: ['/', 'analytics', 'targets'] }
    ]);

    expect(store.select.callCount).to.equal(1);
    expect(store.select.args[0]).to.deep.equal([Selectors.getAnalyticsModules]);
  }));

  it('should return true and not module path if it is not analytics tab', waitForAsync(() => {
    const route = new ActivatedRouteSnapshot();
    route.data = { tab: 'messages' };
    const subject = new Subject();
    store.select.returns(subject);
    router.createUrlTree.returnsArg(0);

    provider
      .canActivateChild(route)
      .subscribe(result => {
        expect(result).to.be.true;
        expect(router.createUrlTree.callCount).to.equal(0);
      });

    subject.next([ { id: 'targets', route: ['/', 'analytics', 'targets'] } ]);

    expect(store.select.callCount).to.equal(1);
    expect(store.select.args[0]).to.deep.equal([Selectors.getAnalyticsModules]);
  }));

  it('should not emit if analytics modules are falsy', fakeAsync(() => {
    const route = new ActivatedRouteSnapshot();
    route.data = { tab: 'messages' };
    const subject = new Subject();
    store.select.returns(subject);
    router.createUrlTree.returnsArg(0);

    provider
      .canActivateChild(route)
      .subscribe(() => {
        assert.fail('Should not emit if analytics modules are falsy');
      });

    subject.next(null);
    flush();

    expect(store.select.callCount).to.equal(1);
    expect(store.select.args[0]).to.deep.equal([Selectors.getAnalyticsModules]);
    expect(router.createUrlTree.callCount).to.equal(0);
  }));
});
