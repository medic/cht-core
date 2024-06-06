import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { SettingsService } from '@mm-services/settings.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';

describe('AnalyticsModulesService', () => {
  let service: AnalyticsModulesService;
  let targetAggregatesService;
  let settingsService;

  beforeEach(() => {
    targetAggregatesService = { isEnabled: sinon.stub() };
    settingsService = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: TargetAggregatesService, useValue: targetAggregatesService },
        { provide: SettingsService, useValue: settingsService },
      ],
    });

    service = TestBed.inject(AnalyticsModulesService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error when settings fails', () => {
    settingsService.get.rejects({ some: 'err' });
    targetAggregatesService.isEnabled.resolves(true);

    return service
      .get()
      .then(() => assert.fail('Should have thrown'))
      .catch(err => expect(err).to.deep.equal({ some: 'err' }));
  });

  it('should enable targets when configured', () => {
    settingsService.get.resolves({ tasks: { targets: { enabled: true } } });
    targetAggregatesService.isEnabled.resolves(false);

    return service
      .get()
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.deep.include({
          label: 'analytics.targets',
          route: ['/', 'analytics', 'targets'],
        });
        expect(result[0].available()).to.equal(true);
      });
  });

  it('should enable target aggregates when configured', () => {
    settingsService.get.resolves({ tasks: { targets: { enabled: true } } });
    targetAggregatesService.isEnabled.resolves(true);

    return service
      .get()
      .then(result => {
        expect(result.length).to.equal(2);
        expect(result[0]).to.deep.include({
          label: 'analytics.targets',
          route: ['/', 'analytics', 'targets'],
        });
        expect(result[0].available()).to.equal(true);
        expect(result[1]).to.deep.include({
          label: 'analytics.target.aggregates',
          route: ['/', 'analytics', 'target-aggregates'],
        });
        expect(result[1].available()).to.equal(true);
      });
  });
});
