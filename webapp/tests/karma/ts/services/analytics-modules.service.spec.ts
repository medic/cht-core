import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { ScheduledFormsService } from '@mm-services/scheduled-forms.service';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';

describe('AnalyticsModulesService', () => {
  let service: AnalyticsModulesService;
  let authService;
  let scheduledFormsService;
  let settingsService;

  beforeEach(() => {
    authService = { has: sinon.stub() };
    scheduledFormsService = { get: sinon.stub() };
    settingsService = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ScheduledFormsService, useValue: scheduledFormsService },
        { provide: SettingsService, useValue: settingsService },
      ]
    });

    service = TestBed.inject(AnalyticsModulesService);
    authService = TestBed.inject(AuthService);
    scheduledFormsService = TestBed.inject(ScheduledFormsService);
    settingsService = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error when settings fails', () => {
    settingsService.get.rejects({ some: 'err' });
    scheduledFormsService.get.resolves();
    authService.has.resolves(true);

    return service
      .get()
      .then(() => assert.fail('Should have thrown'))
      .catch(err => expect(err).to.deep.equal({ some: 'err' }));
  });

  it('should throw an error when scheduledForms fails', () => {
    scheduledFormsService.get.rejects({ some: 'err' });
    settingsService.get.resolves({});
    authService.has.resolves(true);

    return service
      .get()
      .then(() => assert.fail('Should have thrown'))
      .catch(err => expect(err).to.deep.equal({ some: 'err' }));
  });

  it('should enable Reporting Rates when scheduled forms', () => {
    scheduledFormsService.get.resolves(['a', 'b']);
    settingsService.get.resolves({});
    authService.has.resolves(false);

    return service
      .get()
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.include({
          label: 'Reporting Rates',
          route: 'analytics/reporting',
        });
        expect(settingsService.get.callCount).to.equal(1);
        expect(scheduledFormsService.get.callCount).to.equal(1);
        expect(authService.has.callCount).to.equal(1);
        expect(authService.has.args[0]).to.deep.equal(['can_aggregate_targets']);
      });
  });

  it('should enable targets when configured', () => {
    scheduledFormsService.get.resolves([]);
    settingsService.get.resolves({ tasks: { targets: { enabled: true } } });
    authService.has.resolves(false);

    return service
      .get()
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.include({
          label: 'analytics.targets',
          route: 'analytics/targets',
        });
        expect(result[0].available()).to.equal(true);
      });
  });

  it('should enable target aggregates when configured', () => {
    scheduledFormsService.get.resolves([]);
    settingsService.get.resolves({ tasks: { targets: { enabled: true } } });
    authService.has.resolves(true);

    return service
      .get()
      .then(result => {
        expect(result.length).to.equal(2);
        expect(result[0]).to.include({
          label: 'analytics.targets',
          route: 'analytics/targets',
        });
        expect(result[0].available()).to.equal(true);
        expect(result[1]).to.include({
          label: 'analytics.target.aggregates',
          route: 'analytics/target-aggregates/detail',
        });
        expect(result[1].available()).to.equal(true);
      });
  });
});
