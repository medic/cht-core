import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';
import { AnalyticsTargetAggregatesSidebarFilterComponent }
  from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { PerformanceService } from '@mm-services/performance.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GlobalActions } from '@mm-actions/global';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';

describe('Analytics Target Aggregates Component', () => {
  let component: AnalyticsTargetAggregatesComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesComponent>;
  let targetAggregatesService;
  let targetAggregatesActions;
  let globalActions;
  let stopPerformanceTrackStub;
  let performanceService;
  let userSettingsService;
  let store: MockStore;

  beforeEach(waitForAsync(() => {
    targetAggregatesService = {
      isEnabled: sinon.stub(),
      getAggregates: sinon.stub(),
    };
    targetAggregatesActions = {
      setTargetAggregates: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregates'),
      setTargetAggregatesError: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregatesError'),
      setTargetAggregatesLoaded: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregatesLoaded'),
    };
    globalActions = {
      setSidebarFilter: sinon.spy(GlobalActions.prototype, 'setSidebarFilter'),
      clearSidebarFilter: sinon.spy(GlobalActions.prototype, 'clearSidebarFilter'),
    };
    userSettingsService = {
      getUserFacilities: sinon.stub().resolves([
        { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
        { _id: 'facility_2', type: 'district_hospital', name: 'some-facility-2' },
      ])
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    const mockedSelectors = [
      { selector: 'getSelectedTargetAggregate', value: null },
      { selector: 'getTargetAggregates', value: null },
      { selector: 'getTargetAggregatesError', value: null },
      { selector: 'getSidebarFilter', value: null },
    ];

    return TestBed
      .configureTestingModule({
        declarations: [
          AnalyticsTargetAggregatesComponent,
          AnalyticsTargetAggregatesSidebarFilterComponent
        ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: TargetAggregatesService, useValue: targetAggregatesService },
          { provide: PerformanceService, useValue: performanceService },
          { provide: UserSettingsService, useValue: userSettingsService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsTargetAggregatesComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create component', fakeAsync(() => {
    expect(component).to.exist;

    targetAggregatesService.isEnabled.resolves(false);
    component.ngOnInit();
    flush();

    expect(component.sidebarFilter).to.be.undefined;
    expect(component.enabled).to.be.false;
    expect(component.loading).to.be.false;
    expect(component.aggregates).to.be.undefined;
    expect(component.error).to.be.undefined;
  }));

  it('ngOnDestroy() should unsubscribe from observables', () => {
    sinon.reset();
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesLoaded.callCount).to.equal(1);
    expect(globalActions.clearSidebarFilter.callCount).to.equal(1);
  });

  it('should set correct loading and error when TargetAggregates fails', fakeAsync(() => {
    sinon.reset();
    userSettingsService.getUserFacilities.resolves([
      { _id: 'id_1', type: 'district_hospital' },
      { _id: 'id_2', type: 'district_hospital' },
    ]);
    targetAggregatesService.isEnabled.rejects({ some: 'err' });
    const consoleErrorMock = sinon.stub(console, 'error');

    component.ngOnInit();
    flush();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.notCalled).to.be.true;
    expect(component.loading).to.equal(false);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.args[0][0]).to.deep.equal({ some: 'err' });
    expect(component.enabled).to.be.undefined;
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error loading aggregate targets');
  }));

  it('should set aggregates disabled', fakeAsync(() => {
    sinon.reset();
    userSettingsService.getUserFacilities.resolves([
      { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
      { _id: 'facility_2', type: 'district_hospital', name: 'some-facility-2' },
    ]);
    targetAggregatesService.isEnabled.resolves(false);
    component.ngOnInit();
    flush();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(globalActions.setSidebarFilter.callCount).to.equal(1);
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({
      defaultFilters: {
        facility: { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
        reportingPeriod: ReportingPeriod.CURRENT
      },
    });

    expect(component.loading).to.be.false;
    expect(component.enabled).to.be.false;
    expect(targetAggregatesService.getAggregates.notCalled).to.be.true;
    expect(targetAggregatesActions.setTargetAggregatesError.notCalled).to.be.true;
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal([]);
  }));

  it('should set aggregates', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.isEnabled.resolves(true);
    targetAggregatesService.getAggregates.resolves([ { title: 'aggregate-1' } ]);
    userSettingsService.getUserFacilities.resolves([
      { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
      { _id: 'facility_2', type: 'district_hospital', name: 'some-facility-2' },
    ]);
    component.ngOnInit();
    flush();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(globalActions.setSidebarFilter.callCount).to.equal(1);
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({
      defaultFilters: {
        facility: { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
        reportingPeriod: ReportingPeriod.CURRENT
      },
    });
    expect(component.enabled).to.be.true;
    expect(component.loading).to.be.false;
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.notCalled).to.be.true;
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal([
      { title: 'aggregate-1', facility: 'some-facility-1', reportingPeriod: ReportingPeriod.CURRENT },
    ]);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
  }));

  it('should set different aggregates when updateAggregateTargets is called with a new facility', fakeAsync(() => {
    sinon.reset();
    userSettingsService.getUserFacilities.resolves([
      { _id: 'facility_2', type: 'district_hospital', name: 'some-facility-2' },
      { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
    ]);
    targetAggregatesService.isEnabled.resolves(true);
    targetAggregatesService.getAggregates.resolves([ { title: 'aggregate-1' } ]);
    component.ngOnInit();
    flush();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(globalActions.setSidebarFilter.callCount).to.equal(1);
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({
      defaultFilters: {
        facility: { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
        reportingPeriod: ReportingPeriod.CURRENT
      },
    });

    expect(component.loading).to.be.false;
    expect(component.enabled).to.be.true;
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.notCalled).to.be.true;
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal([
      { title: 'aggregate-1', facility: 'some-facility-1', reportingPeriod: ReportingPeriod.CURRENT },
    ]);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);

    targetAggregatesActions.setTargetAggregates.resetHistory();
    targetAggregatesService.getAggregates.resetHistory();

    const facilityTwoAggregates = [ { title: 'new-aggregate-1' } ];
    targetAggregatesService.getAggregates.withArgs('facility_1').resolves(facilityTwoAggregates);

    // Fetch aggregates for user's second facility
    component.getTargetAggregates(
      { _id: 'facility_1', type: 'district_hospital', name: 'some-facility-1' },
      ReportingPeriod.CURRENT
    );
    flush();

    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.calledWith('facility_1')).to.be.true;
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(facilityTwoAggregates);
  }));

});
