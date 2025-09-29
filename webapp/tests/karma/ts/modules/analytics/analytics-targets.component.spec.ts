import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
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

describe('AnalyticsTargetsComponent', () => {
  let component: AnalyticsTargetsComponent;
  let fixture: ComponentFixture<AnalyticsTargetsComponent>;
  let rulesEngineService;
  let performanceService;
  let stopPerformanceTrackStub;
  let sessionService;
  let userSettingsService;
  let globalActions;

  beforeEach(waitForAsync(() => {
    rulesEngineService = {
      isEnabled: sinon.stub().resolves(true),
      fetchTargets: sinon.stub().resolves([]),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };

    globalActions = {
      setSidebarFilter: sinon.spy(GlobalActions.prototype, 'setSidebarFilter'),
      clearSidebarFilter: sinon.spy(GlobalActions.prototype, 'clearSidebarFilter'),
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
      .then(async () => {
        const { MatIconRegistry } = await import('@angular/material/icon');
        const { DomSanitizer } = await import('@angular/platform-browser');
        const matIconRegistry = TestBed.inject(MatIconRegistry);
        const domSanitizer = TestBed.inject(DomSanitizer);
        const iconUrl = domSanitizer.bypassSecurityTrustResourceUrl('./img/icon-close.svg');
        matIconRegistry.addSvgIcon('icon-close', iconUrl);

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
  }));

  it('should fetch targets when rules engine is enabled', fakeAsync(() => {
    sinon.reset();
    rulesEngineService.isEnabled.resolves(true);
    rulesEngineService.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);

    component.ngOnInit();
    tick(50);

    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({
      defaultFilters: {
        reportingPeriod: ReportingPeriod.CURRENT,
      },
    });
    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(rulesEngineService.fetchTargets.callCount).to.equal(1);
    expect(component.targetsDisabled).to.equal(false);
    expect(!!component.errorStack).to.be.false;
    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'analytics:targets:load', recordApdex: true });
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
});
