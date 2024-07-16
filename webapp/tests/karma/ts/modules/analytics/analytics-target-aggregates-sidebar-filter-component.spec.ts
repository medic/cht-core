import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
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
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GlobalActions } from '@mm-actions/global';

describe('Analytics Target Aggregate Sidebar Filter Component', () => {
  let component: AnalyticsTargetAggregatesSidebarFilterComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesSidebarFilterComponent>;
  let contactTypesService;
  let settingsService;
  let userSettingsService;
  let globalActions;
  let store: MockStore;

  beforeEach(async () => {
    contactTypesService = {
      getTypeId: sinon.stub().returns('district_hospital')
    };
    settingsService = { get: sinon.stub().resolves(
      { contact_types: [{ id: 'district_hospital', name_key: 'District Hospital', }] }
    )};
    userSettingsService = {
      getUserFacility: sinon.stub(),
      hasMultipleFacilities: sinon.stub()
    };
    globalActions = {
      setSidebarFilter: sinon.stub(GlobalActions.prototype, 'setSidebarFilter'),
    };

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    await TestBed
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
  });

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
  });

  it('should set selectedFacility and selectedFacilityId when user has multiple facilities', fakeAsync(() => {
    sinon.resetHistory();
    const userFacilities = [{ _id: 'facility_1' }, { _id: 'facility_2' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    userSettingsService.hasMultipleFacilities.resolves(true);

    component.ngOnInit();
    flush();

    expect(component.userFacilities).to.deep.equal(userFacilities);
    expect(component.selectedFacility).to.deep.equal({ _id: 'facility_1' });
    expect(component.selectedFacilityId).to.equal('facility_1');
    expect(userSettingsService.getUserFacility.callCount).to.equal(1);
    expect(userSettingsService.hasMultipleFacilities.callCount).to.equal(1);
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
    expect(settingsService.get.callCount).to.equal(1);
  }));

  it('should set user facility name_key as facilityFilterLabel, when user has multiple facilities', fakeAsync(() => {
    sinon.resetHistory();
    const userFacilities =[
      { _id: 'id_1', type: 'district_hospital' },
      { _id: 'id_2', type: 'district_hospital' },
      { _id: 'id_3', type: 'district_hospital' },
    ];
    const settings = { contact_types: [{ id: 'district_hospital', name_key: 'District Hospital' }] };
    userSettingsService.hasMultipleFacilities.resolves(true);
    userSettingsService.getUserFacility.resolves(userFacilities);
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns('district_hospital');

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal('District Hospital');
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
    expect(userSettingsService.getUserFacility.callCount).to.equal(1);
    expect(userSettingsService.hasMultipleFacilities.callCount).to.equal(1);
    expect(settingsService.get.callCount).to.equal(1);
  }));

  it('should not set selectedFacility and selectedFacilityId when user has one facility', fakeAsync(() => {
    sinon.resetHistory();
    const userFacilities = [{ _id: 'facility' }];
    userSettingsService.getUserFacility.resolves(userFacilities);
    userSettingsService.hasMultipleFacilities.resolves(false);

    component.ngOnInit();
    flush();

    expect(component.selectedFacilityId).to.be.undefined;
    expect(component.selectedFacility).to.be.undefined;
    expect(contactTypesService.getTypeId.callCount).to.equal(0);
    expect(userSettingsService.getUserFacility.callCount).to.equal(1);
    expect(userSettingsService.hasMultipleFacilities.callCount).to.equal(1);
  }));

  it('should not set selectedFacility and selectedFacilityId if user facilities is undefined', fakeAsync(() => {
    sinon.resetHistory();
    const userFacilities = [];
    userSettingsService.getUserFacility.resolves(userFacilities);
    userSettingsService.hasMultipleFacilities.resolves(false);

    component.ngOnInit();
    flush();

    expect(component.selectedFacilityId).to.be.undefined;
    expect(component.selectedFacility).to.be.undefined;
    expect(userSettingsService.getUserFacility.callCount).to.equal(1);
    expect(userSettingsService.hasMultipleFacilities.callCount).to.equal(1);
    expect(contactTypesService.getTypeId.callCount).to.equal(0);
    expect(settingsService.get.callCount).to.equal(0);
  }));

  it('should set error and default facilityFilterLabel when settingsService fails', fakeAsync(() => {
    sinon.resetHistory();
    const DEFAULT_FACILITY_LABEL = 'Facility';
    const userFacilities = [
      { _id: 'place_1', type: 'district_hospital' },
      { _id: 'place_2', type: 'district_hospital' },
    ];
    userSettingsService.hasMultipleFacilities.resolves(true);
    userSettingsService.getUserFacility.resolves(userFacilities);
    settingsService.get.rejects({ some: 'err' });

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(DEFAULT_FACILITY_LABEL);
    expect(component.error).to.be.true;
    expect(userSettingsService.getUserFacility.callCount).to.equal(1);
    expect(userSettingsService.hasMultipleFacilities.callCount).to.equal(1);
    expect(settingsService.get.callCount).to.equal(1);
  }));

  it('should set default facilityFilterLabel when getTypeId returns undefined', fakeAsync(() => {
    sinon.resetHistory();
    const DEFAULT_FACILITY_LABEL = 'Facility';
    const settings = { contact_types: [{ id: 'district_hospital', name_key: 'District Hospital' }] };
    const userFacilities = [
      { _id: 'place_1', type: 'district_hospital' },
      { _id: 'place_2', type: 'district_hospital' },
    ];
    userSettingsService.getUserFacility.resolves(userFacilities);
    userSettingsService.hasMultipleFacilities.resolves(true);
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns(undefined);

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(DEFAULT_FACILITY_LABEL);
    expect(settingsService.get.callCount).to.equal(1);
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
  }));

  it('should set default facilityFilterLabel when contact type is not found', fakeAsync(() => {
    sinon.resetHistory();
    const DEFAULT_FACILITY_LABEL = 'Facility';
    const settings = { contact_types: [ { id: 'health_center', name_key: 'Health Center' }] };
    const userFacilities = [
      { _id: 'id_1', type: 'district_hospital' },
      { _id: 'id_2', type: 'district_hospital' },
    ];
    userSettingsService.getUserFacility.resolves(userFacilities);
    userSettingsService.hasMultipleFacilities.resolves(true);
    settingsService.get.resolves(settings);
    contactTypesService.getTypeId.returns('district_hospital');

    component.ngOnInit();
    flush();

    expect(component.facilityFilterLabel).to.equal(DEFAULT_FACILITY_LABEL);
    expect(userSettingsService.hasMultipleFacilities.callCount).to.equal(1);
    expect(settingsService.get.callCount).to.equal(1);
    expect(contactTypesService.getTypeId.callCount).to.equal(1);
  }));
});
