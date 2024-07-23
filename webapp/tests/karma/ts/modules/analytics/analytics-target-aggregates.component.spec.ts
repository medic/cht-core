import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
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

describe('Analytics Target Aggregates Component', () => {
  let component: AnalyticsTargetAggregatesComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesComponent>;
  let targetAggregatesService;
  let userSettingsService;
  let targetAggregatesActions;
  let stopPerformanceTrackStub;
  let performanceService;
  let store: MockStore;

  beforeEach(waitForAsync(() => {
    targetAggregatesService = {
      isEnabled: sinon.stub().resolves(false),
      getAggregates: sinon.stub()
    };
    const userFacilities = [{ _id: 'facility_1' }];
    userSettingsService = {
      getUserFacility: sinon.stub().resolves(userFacilities)
    };
    targetAggregatesActions = {
      setTargetAggregates: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregates'),
      setTargetAggregatesError: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregatesError'),
      setTargetAggregatesLoaded: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregatesLoaded')
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    const mockedSelectors = [
      { selector: 'getSelectedTargetAggregate', value: null },
      { selector: 'getTargetAggregates', value: null },
      { selector: 'getTargetAggregatesError', value: null },
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

  it('should create component', () => {
    expect(component).to.exist;
    expect(component.isSidebarFilterOpen).to.be.false;
  });

  it('should instantiate correctly', () => {

    const newComponent = new AnalyticsTargetAggregatesComponent(
      sinon.createStubInstance(Store),
      sinon.createStubInstance(TargetAggregatesService),
      sinon.createStubInstance(PerformanceService),
      sinon.createStubInstance(UserSettingsService),
    );

    expect(newComponent.loading).to.equal(true);
    expect(newComponent.error).to.equal(null);
    expect(newComponent.aggregates).to.deep.equal(null);
    expect(newComponent.enabled).to.equal(false);
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    sinon.reset();
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesLoaded.callCount).to.equal(1);
  });

  it('should set userDefaultFacilityId correctly when facility exists', fakeAsync(() => {
    sinon.reset();
    const userFacilities = [{ _id: 'facility_1' }, { _id: 'facility_2' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    targetAggregatesService.isEnabled.resolves(true);
    targetAggregatesService.getAggregates.resolves(['some aggregates']);

    component.ngOnInit();
    tick();

    expect(component.userFacilityId).to.equal('facility_1');
    expect(userSettingsService.getUserFacility.callCount).to.equal(1);
    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
  }));

  it('should set correct loading and error when TargetAggregates fails', fakeAsync(() => {
    sinon.reset();
    const userFacilities = [{ _id: 'facility_1' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    targetAggregatesService.isEnabled.rejects({ some: 'err' });
    const consoleErrorMock = sinon.stub(console, 'error');

    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(0);
    expect(component.loading).to.equal(false);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.args[0][0]).to.deep.equal({ some: 'err' });
    expect(component.enabled).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error getting aggregate targets');
  }));

  it('should set aggregates disabled', fakeAsync(() => {
    sinon.reset();
    const userFacilities = [{ _id: 'facility_1' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    targetAggregatesService.isEnabled.resolves(false);

    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(0);
    expect(component.loading).to.equal(false);
    expect(component.enabled).to.equal(false);
    expect(component.userFacilityId).to.equal('facility_1');
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(0);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(undefined);
  }));

  it('should set aggregates', fakeAsync(() => {
    sinon.reset();
    const userFacilities = [{ _id: 'facility_1' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    targetAggregatesService.isEnabled.resolves(true);
    targetAggregatesService.getAggregates.resolves(['some aggregates']);

    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(component.loading).to.equal(false);
    expect(component.enabled).to.equal(true);
    expect(component.userFacilityId).to.equal('facility_1');
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(0);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(['some aggregates']);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
  }));

  it('should set different aggregates when updateAggregateTargets is called with a new facility', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.isEnabled.resolves(true);
    targetAggregatesService.getAggregates.resolves(['some aggregates']);

    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(component.loading).to.equal(false);
    expect(component.enabled).to.equal(true);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(0);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(['some aggregates']);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);

    targetAggregatesActions.setTargetAggregates.resetHistory();
    targetAggregatesService.getAggregates.resetHistory();

    const facilityTwoAggregates = ['new aggregates'];
    targetAggregatesService.getAggregates.withArgs('facility_2').resolves(facilityTwoAggregates);

    // Fetch aggregates for user's second facility
    component.getTargetAggregates('facility_2');
    tick();

    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.calledWith('facility_2')).to.be.true;
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(facilityTwoAggregates);
  }));

  it('should set different aggregates when updateAggregateTargets is called with a new facility', fakeAsync(() => {
    sinon.reset();
    const userFacilities = [{ _id: 'facility_1' }, { _id: 'facility_2' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    targetAggregatesService.isEnabled.resolves(true);

    const facilityOneAggregates = ['some aggregates'];
    targetAggregatesService.getAggregates.withArgs('facility_1').resolves(facilityOneAggregates);

    const facilityTwoAggregates = ['new aggregates'];
    targetAggregatesService.getAggregates.withArgs('facility_2').resolves(facilityTwoAggregates);

    component.ngOnInit();
    tick();

    expect(component.userFacilityId).to.equal('facility_1');
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(facilityOneAggregates);

    targetAggregatesActions.setTargetAggregates.resetHistory();
    targetAggregatesService.getAggregates.resetHistory();

    // Fetch aggregates for user's second facility
    component.updateAggregateTargets('facility_2');
    tick();

    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.calledWith('facility_2')).to.be.true;
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(facilityTwoAggregates);
  }));
});
