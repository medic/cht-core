import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { Selectors } from '@mm-selectors/index';
import { AnalyticsTargetAggregatesSidebarFilterComponent }
  from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GlobalActions } from '@mm-actions/global';

describe('Analytics Target Aggregate Sidebar Filter Component', () => {
  let component: AnalyticsTargetAggregatesSidebarFilterComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesSidebarFilterComponent>;
  let contactTypesService;
  let settingsService;
  let telemetryService;
  let userSettingsService;
  let globalActions;
  let store: MockStore;

  beforeEach(waitForAsync(() => {
    contactTypesService = {
      getTypeId: sinon.stub().returns('district_hospital')
    };
    settingsService = { get: sinon.stub().resolves(
      { contact_types: [{ id: 'district_hospital', name_key: 'District Hospital', }] }
    ) };
    telemetryService = { record: sinon.stub() };
    userSettingsService = {
      getUserFacility: sinon.stub().resolves([{ _id: 'facility_1' }, { _id: 'facility_2' }]),
      hasMultipleFacilities: sinon.stub().resolves(true)
    };
    globalActions = {
      setSidebarFilter: sinon.stub(GlobalActions.prototype, 'setSidebarFilter'),
    };

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          MatExpansionModule
        ],
        declarations: [
          AnalyticsTargetAggregatesSidebarFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ContactTypesService, useValue: contactTypesService },
          { provide: SettingsService, useValue: settingsService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: UserSettingsService, useValue: userSettingsService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsTargetAggregatesSidebarFilterComponent);
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
    expect(component.isOpen).to.be.false;
    expect(component.error).to.be.undefined;
  }));

  it('should toggle sidebar filter', () => {
    component.toggleSidebarFilter();
    component.toggleSidebarFilter();
    component.toggleSidebarFilter();

    expect(globalActions.setSidebarFilter.calledThrice).to.be.true;
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({ isOpen: true });
    expect(globalActions.setSidebarFilter.args[1][0]).to.deep.equal({ isOpen: false });
    expect(globalActions.setSidebarFilter.args[2][0]).to.deep.equal({ isOpen: true });
    expect(telemetryService.record.calledTwice).to.be.true;
  });

  it('should set userFacilities and selectedFacilityId when user has multiple facilities', fakeAsync(() => {
    const userFacilities = [{ _id: 'facility_1' }, { _id: 'facility_2' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    userSettingsService.hasMultipleFacilities.resolves(true);

    expect(component.userFacilities).to.deep.equal(userFacilities);
    expect(component.selectedFacilityId).to.equal('facility_1');
    expect(userSettingsService.getUserFacility.calledOnce).to.be.true;
    expect(userSettingsService.hasMultipleFacilities.calledOnce).to.be.true;
  }));

  it('should set user facility name_key as facilityFilterLabel', fakeAsync(() => {
    contactTypesService.getTypeId.returns('district_hospital');
    component.userFacilities = [{ _id: 'facility_1', type: 'district_hospital' }];

    expect(component.facilityFilterLabel).to.equal('District Hospital');
    expect(settingsService.get.calledOnce).to.be.true;
    expect(contactTypesService.getTypeId.calledOnce).to.be.true;
  }));

  it('should set error and default facilityFilterLabel when settings service fails', fakeAsync(() => {
    const DEFAULT_FACILITY_LABEL = 'Facility';
    settingsService.get.rejects({ some: 'err' });

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(DEFAULT_FACILITY_LABEL);
    expect(component.error).to.be.true;
  }));

  it('should set error and default facilityFilterLabel when contact type is not found', fakeAsync(() => {
    const DEFAULT_FACILITY_LABEL = 'Facility';
    const settings = {
      contact_types: [
        { id: 'health_center', name_key: 'Health Center' }
      ]
    };
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns('district_hospital');
    component.userFacilities = [{ _id: 'facility_1', type: 'district_hospital' }];

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(DEFAULT_FACILITY_LABEL);
    expect(component.error).to.be.true;
  }));
});
