import { waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { ActivatedRouteSnapshot } from '@angular/router';

import { AppRouteGuardProvider } from '../../../../src/ts/app-route.guard.provider';

describe('RouteGuard provider', () => {
  let authService;
  let router;
  let provider:AppRouteGuardProvider;

  beforeEach(() => {
    authService = { has: sinon.stub() };
    router = { navigate: sinon.stub() };

    provider = new AppRouteGuardProvider(authService, router);
  });

  afterEach(() => sinon.stub());

  it('should return true when no route data', waitForAsync(() => {
    const snapshot = new ActivatedRouteSnapshot();
    provider.canActivate(snapshot).subscribe(value => {
      expect(value).to.equal(true);
      expect(authService.has.callCount).to.equal(0);
    });
  }));

  it('should return true when no permissions', waitForAsync(() => {
    const snapshot = new ActivatedRouteSnapshot();
    snapshot.data = { no: 'permissions', name: 'thing' };
    provider.canActivate(snapshot).subscribe(value => {
      expect(value).to.equal(true);
      expect(authService.has.callCount).to.equal(0);
    });
  }));

  it('should return false and navigate to error when not allowed', waitForAsync(() => {
    authService.has.resolves(false);
    const snapshot = new ActivatedRouteSnapshot();
    snapshot.data = { permissions: 'can_activate' };
    provider.canActivate(snapshot).subscribe(value => {
      expect(value).to.equal(false);
      expect(authService.has.callCount).to.equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_activate']);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['error', '403']]);
    });
  }));

  it('should return true and not navigate to error when allowed', waitForAsync(() => {
    authService.has.resolves(true);
    const snapshot = new ActivatedRouteSnapshot();
    snapshot.data = { permissions: 'can_really_activate' };
    provider.canActivate(snapshot).subscribe(value => {
      expect(value).to.equal(true);
      expect(authService.has.callCount).to.equal(1);
      expect(authService.has.args[0]).to.deep.equal(['can_really_activate']);
      expect(router.navigate.callCount).to.equal(0);
    });
  }));
});
