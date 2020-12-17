import { async, ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('AnalyticsTargetsComponent', () => {
  let component: AnalyticsTargetsComponent;
  let fixture: ComponentFixture<AnalyticsTargetsComponent>;
  let rulesEngineService;
  let telemetryService;

  beforeEach(async(() => {
    rulesEngineService = {
      isEnabled: sinon.stub().resolves(true),
      fetchTargets: sinon.stub().resolves([]),
    };
    telemetryService = { record: sinon.stub() };

    return TestBed
      .configureTestingModule({
        declarations: [ AnalyticsTargetsComponent ],
        providers: [
          { provide: RulesEngineService, useValue: rulesEngineService },
          { provide: TelemetryService, useValue: telemetryService }
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsTargetsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('should set up component when rules engine is not enabled', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(false);

    component.ngOnInit();
    tick(50);

    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(0);
    expect(component.targetsDisabled).to.equal(true);
    expect(telemetryService.record.callCount).to.equal(1);
    expect(telemetryService.record.args[0][0]).to.equal('analytics:targets:load');
    expect(component.targets).to.deep.equal([]);
    expect(component.loading).to.equal(false);
  }));

  it('should fetch targets when rules engine is enabled', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    rulesEngineService.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);

    component.ngOnInit();
    tick(50);

    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(1);
    expect(component.targetsDisabled).to.equal(false);
    expect(telemetryService.record.callCount).to.equal(1);
    expect(telemetryService.record.args[0][0]).to.equal('analytics:targets:load');
    expect(component.targets).to.deep.equal([{ id: 'target1' }, { id: 'target2' }]);
    expect(component.loading).to.equal(false);
  }));

  it('should filter targets to visible ones', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    const targets = [
      { id: 'target1' },
      { id: 'target1', visible: true },
      { id: 'target1', visible: undefined },
      { id: 'target1', visible: false },
      { id: 'target1', visible: 'something' },
    ];
    rulesEngineService.fetchTargets.resolves(targets);

    component.ngOnInit();
    tick(50);

    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(1);
    expect(component.targets).to.deep.equal([
      { id: 'target1' },
      { id: 'target1', visible: true },
      { id: 'target1', visible: undefined },
      { id: 'target1', visible: 'something' },
    ]);
    expect(component.loading).to.equal(false);
  }));

  it('should catch rules engine errors', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.rejects({ some: 'err' });
    const consoleErrorMock = sinon.stub(console, 'error');

    component.ngOnInit();
    tick(50);

    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(0);
    expect(component.targetsDisabled).to.equal(false);
    expect(component.targets).to.deep.equal([]);
    expect(component.loading).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error getting targets');
  }));
});
