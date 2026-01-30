import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { GlobalActions } from '@mm-actions/global';
import { AnalyticsTargetsComponent } from '@mm-modules/analytics/analytics-targets.component';
import {
  AnalyticsSidebarFilterComponent,
  ReportingPeriod
} from '@mm-modules/analytics/analytics-sidebar-filter.component';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { SessionService } from '@mm-services/session.service';
import { PerformanceService } from '@mm-services/performance.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { Selectors } from '@mm-selectors/index';

describe('AnalyticsTargetsComponent', () => {
  let component: AnalyticsTargetsComponent;
  let fixture: ComponentFixture<AnalyticsTargetsComponent>;
  let rulesEngineService;
  let performanceService;
  let stopPerformanceTrackStub;
  let sessionService;
  let userSettingsService;
  let globalActions;
  let store: MockStore;

  beforeEach(waitForAsync(() => {
    rulesEngineService = {
      isEnabled: sinon.stub().resolves(true),
      fetchTargets: sinon.stub().resolves([]),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };

    globalActions = {
      clearSidebarFilter: sinon.stub(GlobalActions.prototype, 'clearSidebarFilter'),
      setTitle: sinon.stub(GlobalActions.prototype, 'setTitle'),
      setShowContent: sinon.stub(GlobalActions.prototype, 'setShowContent'),
    };

    userSettingsService = {
      getUserFacilities: sinon.stub().resolves([
        {
          _id: 'facility_1',
          type: 'district_hospital',
          name: 'some-facility-1',
        },
      ]),
    };

    const contactTypesService = {
      getTypeId: sinon.stub().returns('district_hospital'),
    };

    const settingsService = {
      get: sinon.stub().resolves({
        contact_types: [
          {
            id: 'district_hospital',
            name: 'contact.type.district_hospital',
          }
        ],
      }),
    };

    const telemetryService = {
      record: sinon.stub(),
    };

    const mockedSelectors = [
      { selector: 'getSidebarFilter', value: { isOpen: false } },
      { selector: 'getDirection', value: 'ltr' },
    ];

    sessionService = {
      isOnlineOnly: sinon.stub().returns(false),
      userCtx: sinon.stub()
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          AnalyticsTargetsComponent,
          AnalyticsSidebarFilterComponent
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          provideHttpClient(),
          { provide: RulesEngineService, useValue: rulesEngineService },
          { provide: PerformanceService, useValue: performanceService },
          { provide: SessionService, useValue: sessionService },
          { provide: UserSettingsService, useValue: userSettingsService },
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: SettingsService, useValue: settingsService },
          { provide: TelemetryService, useValue: telemetryService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsTargetsComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
    expect(performanceService.track.calledOnce).to.be.true;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    sinon.reset();
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(globalActions.clearSidebarFilter.callCount).to.equal(1);
  });

  it('should set up component when rules engine is not enabled', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(false);

    component.ngOnInit();
    tick(50);

    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(0);
    expect(component.targetsDisabled).to.equal(true);
    expect(!!component.errorStack).to.be.false;
    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'analytics:targets:load', recordApdex: true });
    expect(component.targets).to.deep.equal([]);
    expect(component.loading).to.equal(false);
    expect(globalActions.setTitle.notCalled).to.be.true;
    expect(globalActions.setShowContent.calledOnceWithExactly(false)).to.be.true;
  }));

  it('should fetch targets when rules engine is enabled', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    rulesEngineService.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);

    component.ngOnInit();
    tick(50);

    expect(component.reportingPeriodFilter).to.equal(ReportingPeriod.CURRENT);
    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets).to.have.been.calledOnceWithExactly(ReportingPeriod.CURRENT);
    expect(component.targetsDisabled).to.equal(false);
    expect(!!component.errorStack).to.be.false;
    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'analytics:targets:load', recordApdex: true });
    expect(component.targets).to.deep.equal([{ id: 'target1' }, { id: 'target2' }]);
    expect(component.loading).to.equal(false);
    expect(globalActions.setTitle.notCalled).to.be.true;
    expect(globalActions.setShowContent.calledOnceWithExactly(false)).to.be.true;
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
    expect(rulesEngineService.fetchTargets).to.have.been.calledOnceWithExactly(ReportingPeriod.CURRENT);
    expect(!!component.errorStack).to.be.false;
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
    rulesEngineService.isEnabled.rejects('error');
    const consoleErrorMock = sinon.stub(console, 'error');

    component.ngOnInit();
    tick(50);

    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(0);
    expect(component.targetsDisabled).to.equal(false);
    expect(!!component.errorStack).to.be.true;
    expect(component.targets).to.deep.equal([]);
    expect(component.loading).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error getting targets');
  }));

  it(`should fetch targets when reporting period set to CURRENT`, async () => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    rulesEngineService.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);

    await component.getTargets(ReportingPeriod.CURRENT);

    expect(component.reportingPeriodFilter).to.equal(ReportingPeriod.CURRENT);
    expect(rulesEngineService.isEnabled).to.have.been.calledOnceWithExactly();
    expect(rulesEngineService.fetchTargets).to.have.been.calledOnceWithExactly(ReportingPeriod.CURRENT);
    expect(component.targetsDisabled).to.be.false;
    expect(component.errorStack).to.be.undefined;
    expect(stopPerformanceTrackStub).to.have.been.calledOnceWithExactly(
      { name: 'analytics:targets:load', recordApdex: true }
    );
    expect(component.targets).to.deep.equal([{ id: 'target1' }, { id: 'target2' }]);
    expect(component.loading).to.be.false;
    expect(globalActions.setTitle.notCalled).to.be.true;
    expect(globalActions.setShowContent.calledOnceWithExactly(false)).to.be.true;
  });

  it(`should fetch targets when reporting period set to PREVIOUS`, async () => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    rulesEngineService.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);

    await component.getTargets(ReportingPeriod.PREVIOUS);

    expect(component.reportingPeriodFilter).to.equal(ReportingPeriod.PREVIOUS);
    expect(rulesEngineService.isEnabled).to.have.been.calledOnceWithExactly();
    expect(rulesEngineService.fetchTargets).to.have.been.calledOnceWithExactly(ReportingPeriod.PREVIOUS);
    expect(component.targetsDisabled).to.be.false;
    expect(component.errorStack).to.be.undefined;
    expect(stopPerformanceTrackStub).to.have.been.calledOnceWithExactly(
      { name: 'analytics:targets:load', recordApdex: true }
    );
    expect(component.targets).to.deep.equal([{ id: 'target1' }, { id: 'target2' }]);
    expect(component.loading).to.be.false;
    expect(globalActions.setTitle.calledOnceWithExactly('targets.last_month.subtitle')).to.be.true;
    expect(globalActions.setShowContent.calledOnceWithExactly(true)).to.be.true;
  });

  it(`should reset to the default reporting period when showContent is set to false`, fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    rulesEngineService.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);

    store.overrideSelector(Selectors.getShowContent, false);
    store.refreshState();
    tick();

    // Nothing done when CURRENT
    expect(globalActions.setShowContent.notCalled).to.be.true;
    expect(component.reportingPeriodFilter).to.equal(ReportingPeriod.CURRENT);

    component.reportingPeriodFilter = ReportingPeriod.PREVIOUS;
    store.overrideSelector(Selectors.getShowContent, true);
    store.refreshState();
    tick();

    // Nothing done when showContent is true
    expect(globalActions.setShowContent.notCalled).to.be.true;
    expect(component.reportingPeriodFilter).to.equal(ReportingPeriod.PREVIOUS);

    store.overrideSelector(Selectors.getShowContent, false);
    store.refreshState();
    tick();

    // Targets reset to default
    expect(component.reportingPeriodFilter).to.equal(ReportingPeriod.CURRENT);
    expect(rulesEngineService.isEnabled).to.have.been.calledOnceWithExactly();
    expect(rulesEngineService.fetchTargets).to.have.been.calledOnceWithExactly(ReportingPeriod.CURRENT);
    expect(component.targetsDisabled).to.be.false;
    expect(component.errorStack).to.be.undefined;
    expect(stopPerformanceTrackStub).to.have.been.calledOnceWithExactly(
      { name: 'analytics:targets:load', recordApdex: true }
    );
    expect(component.targets).to.deep.equal([{ id: 'target1' }, { id: 'target2' }]);
    expect(component.loading).to.be.false;
    expect(globalActions.setTitle.notCalled).to.be.true;
    expect(globalActions.setShowContent.calledOnceWithExactly(false)).to.be.true;
  }));
});
