import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { FormsModule } from '@angular/forms';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Selectors } from '@mm-selectors/index';
import {
  AnalyticsSidebarFilterComponent,
  ReportingPeriod
} from '@mm-modules/analytics/analytics-sidebar-filter.component';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';

describe('Analytics Sidebar Filter Component', () => {
  let component: AnalyticsSidebarFilterComponent;
  let fixture: ComponentFixture<AnalyticsSidebarFilterComponent>;
  let contactTypesService;
  let settingsService;
  let telemetryService;
  let globalActions;
  let store: MockStore;

  beforeEach(async () => {
    contactTypesService = {
      getTypeId: sinon.stub().returns('district_hospital')
    };
    settingsService = {
      get: sinon
        .stub()
        .resolves({ contact_types: [{ id: 'district_hospital', name_key: 'District Hospital', }] })
    };
    telemetryService = { record: sinon.stub() };
    globalActions = {
      setSidebarFilter: sinon.stub(GlobalActions.prototype, 'setSidebarFilter'),
    };

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    await TestBed
      .configureTestingModule({
        imports: [
          FormsModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          MatExpansionModule,
          MatIconModule,
          AnalyticsSidebarFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: SettingsService, useValue: settingsService },
          { provide: TelemetryService, useValue: telemetryService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsSidebarFilterComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        component.userFacilities = [];
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create component', fakeAsync(() => {
    expect(component).to.exist;
    expect(component.filterState).to.deep.equal({});
  }));

  it('should unsubscribe from observables on component destroy', () => {
    const unsubscribeSpy = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.callCount).to.equal(1);
  });

  it('should toggle sidebar filter', () => {
    component.toggleSidebarFilter();

    store.overrideSelector(Selectors.getSidebarFilter, { isOpen: true, filterCount: { total: 0 } });
    store.refreshState();

    component.toggleSidebarFilter();

    store.overrideSelector(Selectors.getSidebarFilter, { isOpen: false, filterCount: { total: 0 } });
    store.refreshState();

    component.toggleSidebarFilter();

    expect(globalActions.setSidebarFilter.args).to.deep.equal([
      [{ filterCount: { total: 0 } }],
      [{ isOpen: true }],
      [{ isOpen: false }],
      [{ isOpen: true }]
    ]);
  });

  it('should update the filter count when the selected values change', fakeAsync(() => {
    sinon.resetHistory();
    const userFacilities = [
      { _id: 'id_1', _rev: '1-abc', type: 'district_hospital' },
      { _id: 'id_2', _rev: '1-def', type: 'district_hospital' },
    ];
    component.userFacilities = [userFacilities[0]];

    component.ngOnInit();
    flush();

    expect(globalActions.setSidebarFilter.calledOnceWithExactly({ filterCount: { total: 0 } })).to.be.true;
    sinon.resetHistory();

    store.overrideSelector(Selectors.getSidebarFilter, {
      reportingPeriod: ReportingPeriod.CURRENT,
      facility: userFacilities[0],
      filterCount: { total: 0 }
    });
    store.refreshState();

    // No filter value set because filter value did not change
    expect(globalActions.setSidebarFilter.notCalled).to.be.true;
    sinon.resetHistory();

    store.overrideSelector(Selectors.getSidebarFilter, {
      reportingPeriod: ReportingPeriod.PREVIOUS,
      facility: userFacilities[0],
      filterCount: { total: 11 }
    });
    store.refreshState();

    expect(globalActions.setSidebarFilter.calledWithExactly({ filterCount: { total: 1 } })).to.be.true;
    sinon.resetHistory();

    component.userFacilities = userFacilities;
    store.overrideSelector(Selectors.getSidebarFilter, {
      reportingPeriod: ReportingPeriod.PREVIOUS,
      facility: userFacilities[1],
      filterCount: { total: 1 }
    });
    store.refreshState();

    expect(globalActions.setSidebarFilter.calledWithExactly({ filterCount: { total: 2 } })).to.be.true;
  }));

  it('should set user facility name_key as facilityFilterLabel, when user has multiple facilities', fakeAsync(() => {
    sinon.resetHistory();
    component.userFacilities = [
      { _id: 'id_1', _rev: '1-abc', type: 'district_hospital' },
      { _id: 'id_2', _rev: '1-def', type: 'district_hospital' },
      { _id: 'id_3', _rev: '1-ghi', type: 'district_hospital' },
    ];
    const settings = { contact_types: [{ id: 'district_hospital', name_key: 'District Hospital' }] };
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns('district_hospital');

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal('District Hospital');
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
    expect(settingsService.get.callCount).to.equal(1);
  }));

  it('should set error and default facilityFilterLabel when settingsService fails', fakeAsync(() => {
    sinon.resetHistory();
    component.userFacilities = [
      { _id: 'place_1', _rev: '1-abc', type: 'district_hospital' },
      { _id: 'place_2', _rev: '1-def', type: 'district_hospital' },
    ];
    settingsService.get.rejects({ some: 'err' });

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(component.DEFAULT_FACILITY_LABEL);
    expect(settingsService.get.callCount).to.equal(1);
  }));

  it('should set default facilityFilterLabel when getTypeId returns undefined', fakeAsync(() => {
    sinon.resetHistory();
    const settings = { contact_types: [{ id: 'district_hospital', name_key: 'District Hospital' }] };
    component.userFacilities = [
      { _id: 'place_1', _rev: '1-abc', type: 'district_hospital' },
      { _id: 'place_2', _rev: '1-def', type: 'district_hospital' },
    ];
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns(undefined);

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(component.DEFAULT_FACILITY_LABEL);
    expect(settingsService.get.callCount).to.equal(1);
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
  }));

  it('should set default facilityFilterLabel when contact type is not found', fakeAsync(() => {
    sinon.resetHistory();
    const settings = { contact_types: [{ id: 'health_center', name_key: 'Health Center' }] };
    component.userFacilities = [
      { _id: 'id_1', _rev: '1-abc', type: 'district_hospital' },
      { _id: 'id_2', _rev: '1-def', type: 'district_hospital' },
    ];
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns('district_hospital');

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(component.DEFAULT_FACILITY_LABEL);
    expect(settingsService.get.callCount).to.equal(1);
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
  }));

  it('should emit selected facility when fetchAggregateTargetsByFacility is called', () => {
    const facility = {
      _id: 'place_1',
      _rev: '1-abc',
      type: 'district_hospital',
    };
    const spyFacility = sinon.spy(component.facilitySelectionChanged, 'emit');

    component.fetchAggregateTargetsByFacility(facility);

    expect(spyFacility.callCount).to.equal(1);
    expect(spyFacility.firstCall.args[0]).to.deep.equal(facility);
    expect(telemetryService.record.args[0])
      .to.deep.equal(['sidebar_filter:analytics:target_aggregates:facility:select']);
  });

  it('should emit reporting period when toggled', () => {
    const spyReportingPeriod = sinon.spy(component.reportingPeriodSelectionChanged, 'emit');

    component.fetchAggregateTargetsByReportingPeriod(ReportingPeriod.PREVIOUS);

    expect(spyReportingPeriod.callCount).to.equal(1);
    expect(spyReportingPeriod.firstCall.args[0]).to.equal(ReportingPeriod.PREVIOUS);
    expect(telemetryService.record.args[0])
      .to.deep.equal(['sidebar_filter:analytics:target_aggregates:reporting-period:select']);
  });

  it('should collect telemetry when fetchAggregateTargetsByFacility is called', () => {
    const facility = {
      _id: 'place_1',
      _rev: '1-abc',
      type: 'district_hospital',
    };
    component.telemetryKey = 'targets';

    component.fetchAggregateTargetsByFacility(facility);

    expect(telemetryService.record.args[0])
      .to.deep.equal(['sidebar_filter:analytics:targets:facility:select']);
  });

  it('should collect telemetry when fetchAggregateTargetsByReportingPeriod is called', () => {
    component.telemetryKey = 'targets';
    component.fetchAggregateTargetsByReportingPeriod(ReportingPeriod.CURRENT);

    expect(telemetryService.record.args[0])
      .to.deep.equal(['sidebar_filter:analytics:targets:reporting-period:select']);
  });
});
