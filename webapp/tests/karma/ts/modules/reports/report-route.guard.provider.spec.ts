import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';

import { ReportsAddDeactivationGuardProvider } from '@mm-modules/reports/report-route.guard.provider';

describe('ReportsAddDeactivationGuardProvider', () => {
  let guard: ReportsAddDeactivationGuardProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReportsAddDeactivationGuardProvider,
        provideMockStore(),
      ],
    });

    guard = TestBed.inject(ReportsAddDeactivationGuardProvider);
  });

  it('should allow deactivation when the component is null', () => {
    const route = new ActivatedRouteSnapshot();
    const state = { url: '' } as RouterStateSnapshot;

    expect(guard.canDeactivate(null, route, state, state)).to.be.true;
  });
});
