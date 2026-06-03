import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AppRouteGuardProvider } from '@admin-tool-providers/app-route.guard.provider';
import { AuthService } from '@admin-tool-services/auth.service';

describe('AppRouteGuardProvider', () => {
  let guard: AppRouteGuardProvider;
  let authService;
  let router;

  beforeEach(() => {
    authService = { has: sinon.stub() };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AppRouteGuardProvider,
        { provide: AuthService, useValue: authService },
      ]
    });

    guard = TestBed.inject(AppRouteGuardProvider);
    router = TestBed.inject(Router);
    sinon.stub(router, 'navigate');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should allow navigation when no permissions defined on route', (done) => {
    const route: any = { data: {} };

    guard.canActivate(route).subscribe(result => {
      expect(result).to.be.true;
      expect(authService.has.callCount).to.equal(0);
      done();
    });
  });

  it('should allow navigation when route has no data', (done) => {
    const route: any = { data: null };

    guard.canActivate(route).subscribe(result => {
      expect(result).to.be.true;
      done();
    });
  });

  it('should allow navigation when user has required permissions', (done) => {
    authService.has.resolves(true);
    const route: any = { data: { permissions: ['can_configure'] } };

    guard.canActivate(route).subscribe(result => {
      expect(result).to.be.true;
      expect(authService.has.calledWith(['can_configure'])).to.be.true;
      expect((router.navigate as sinon.SinonStub).callCount).to.equal(0);
      done();
    });
  });

  it('should redirect to 403 when user lacks permissions', (done) => {
    authService.has.resolves(false);
    const route: any = { data: { permissions: ['can_configure'] } };

    guard.canActivate(route).subscribe(result => {
      expect(result).to.be.false;
      expect((router.navigate as sinon.SinonStub).calledWith(['error', '403'])).to.be.true;
      done();
    });
  });

  it('should redirect to custom path when route specifies redirect', (done) => {
    authService.has.resolves(false);
    const route: any = { data: { permissions: ['can_upgrade'], redirect: ['upgrade', 'denied'] } };

    guard.canActivate(route).subscribe(result => {
      expect(result).to.be.false;
      expect((router.navigate as sinon.SinonStub).calledWith(['upgrade', 'denied'])).to.be.true;
      done();
    });
  });
});
