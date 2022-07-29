import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { DatePipe } from '@angular/common';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';

import { Selectors } from '@mm-selectors/index';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { SessionService } from '@mm-services/session.service';
import { ReportsSidebarFilterComponent } from '@mm-modules/reports/reports-sidebar-filter.component';
import { TelemetryService } from '@mm-services/telemetry.service';
import { GlobalActions } from '@mm-actions/global';

describe('Reports Sidebar Filter Component', () => {
  let component: ReportsSidebarFilterComponent;
  let fixture: ComponentFixture<ReportsSidebarFilterComponent>;
  let telemetryService;
  let placeHierarchyService;
  let sessionService;
  let globalActions;
  let datePipe;

  beforeEach(waitForAsync(() => {
    telemetryService = { record: sinon.stub() };
    placeHierarchyService = { get: sinon.stub().resolves([]) };
    sessionService = { isOnlineOnly: sinon.stub() };
    datePipe = { transform: sinon.stub() };
    (<any>$.fn).daterangepicker = sinon.stub().returns({ on: sinon.stub() });
    globalActions = {
      setSidebarFilter: sinon.stub(GlobalActions.prototype, 'setSidebarFilter'),
      clearFilters: sinon.stub(GlobalActions.prototype, 'clearFilters'),
      clearSidebarFilter: sinon.stub(GlobalActions.prototype, 'clearSidebarFilter'),
    };
    const mockedSelectors = [
      { selector: Selectors.getFilters, value: {} },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          ReportsSidebarFilterComponent,
          DateFilterComponent,
          FacilityFilterComponent,
          FormTypeFilterComponent,
          StatusFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: TelemetryService, useValue: telemetryService },
          { provide: PlaceHierarchyService, useValue: placeHierarchyService },
          { provide: SessionService, useValue: sessionService },
          { provide: DatePipe, useValue: datePipe },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsSidebarFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create component', fakeAsync(() => {
    flush();
    expect(component).to.exist;
    expect(component.isResettingFilters).to.be.false;
    expect(component.filterCount).to.be.empty;
    expect(component.isOpen).to.be.false;
    expect(component.formTypeFilter).to.exist;
    expect(component.facilityFilter).to.exist;
    expect(component.toDateFilter).to.exist;
    expect(component.fromDateFilter).to.exist;
    expect(component.statusFilter).to.exist;
  }));

  it('should emit search when applying filters', () => {
    const searchSpy = sinon.spy(component.search, 'emit');
    component.applyFilters();
    expect(searchSpy.calledOnce).to.be.true;
  });

  it('should clear all filters', () => {
    const formClearSpy = sinon.spy(component.formTypeFilter, 'clear');
    const facilityClearSpy = sinon.spy(component.facilityFilter, 'clear');
    const fromDateClearSpy = sinon.spy(component.fromDateFilter, 'clear');
    const toDateClearSpy = sinon.spy(component.toDateFilter, 'clear');
    const statusClearSpy = sinon.spy(component.statusFilter, 'clear');

    component.clearFilters();

    expect(formClearSpy.calledOnce).to.be.true;
    expect(facilityClearSpy.calledOnce).to.be.true;
    expect(fromDateClearSpy.calledOnce).to.be.true;
    expect(toDateClearSpy.calledOnce).to.be.true;
    expect(statusClearSpy.calledOnce).to.be.true;
  });

  it('should clear some filters', () => {
    const formClearSpy = sinon.spy(component.formTypeFilter, 'clear');
    const facilityClearSpy = sinon.spy(component.facilityFilter, 'clear');
    const fromDateClearSpy = sinon.spy(component.fromDateFilter, 'clear');
    const toDateClearSpy = sinon.spy(component.toDateFilter, 'clear');
    const statusClearSpy = sinon.spy(component.statusFilter, 'clear');
    const shouldClear = [ 'fromDateFilter', 'placeFilter', 'statusFilter' ];

    component.clearFilters(shouldClear);

    expect(formClearSpy.notCalled).to.be.true;
    expect(facilityClearSpy.calledOnce).to.be.true;
    expect(fromDateClearSpy.calledOnce).to.be.true;
    expect(toDateClearSpy.notCalled).to.be.true;
    expect(statusClearSpy.calledOnce).to.be.true;
  });

  it('should count selected items', () => {
    const formCountSpy = sinon.spy(component.formTypeFilter, 'countSelected');
    const facilityCountSpy = sinon.spy(component.facilityFilter, 'countSelected');
    const fromDateCountSpy = sinon.spy(component.fromDateFilter, 'countSelected');
    const toDateCountSpy = sinon.spy(component.toDateFilter, 'countSelected');
    const statusCountSpy = sinon.spy(component.statusFilter, 'countSelected');
    const selectedForms = new Set();
    selectedForms.add('pregnancy_form');
    selectedForms.add('u5_assessment');
    component.formTypeFilter.inlineFilter.selected = selectedForms;
    component.fromDateFilter.dateRange.from = new Date();
    const expectedCount = {
      total: 3,
      fromDateFilter: 1,
      toDateFilter: 0,
      formFilter: 2,
      statusFilter: 0,
      placeFilter: 0,
    };

    component.countSelected();

    expect(formCountSpy.calledOnce).to.be.true;
    expect(facilityCountSpy.calledOnce).to.be.true;
    expect(fromDateCountSpy.calledOnce).to.be.true;
    expect(toDateCountSpy.calledOnce).to.be.true;
    expect(statusCountSpy.calledOnce).to.be.true;
    expect(component.filterCount).to.deep.equal(expectedCount);
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({ filterCount: expectedCount });
  });

  it('should reset filters', () => {
    const searchSpy = sinon.spy(component.search, 'emit');
    const formClearSpy = sinon.spy(component.formTypeFilter, 'clear');
    const facilityClearSpy = sinon.spy(component.facilityFilter, 'clear');
    const fromDateClearSpy = sinon.spy(component.fromDateFilter, 'clear');
    const toDateClearSpy = sinon.spy(component.toDateFilter, 'clear');
    const statusClearSpy = sinon.spy(component.statusFilter, 'clear');

    component.resetFilters();

    expect(formClearSpy.calledOnce).to.be.true;
    expect(facilityClearSpy.calledOnce).to.be.true;
    expect(fromDateClearSpy.calledOnce).to.be.true;
    expect(toDateClearSpy.calledOnce).to.be.true;
    expect(statusClearSpy.calledOnce).to.be.true;
    expect(globalActions.clearFilters.calledOnce).to.be.true;
    expect(searchSpy.calledOnce).to.be.true;
  });

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

  it('should clear filters in the store on component destroy', () => {
    component.ngOnDestroy();

    expect(globalActions.clearSidebarFilter.calledOnce).to.be.true;
    expect(globalActions.clearFilters.calledOnce).to.be.true;
  });

  it('should do nothing if component is disabled', () => {
    const searchSpy = sinon.spy(component.search, 'emit');
    const formClearSpy = sinon.spy(component.formTypeFilter, 'clear');
    const facilityClearSpy = sinon.spy(component.facilityFilter, 'clear');
    const fromDateClearSpy = sinon.spy(component.fromDateFilter, 'clear');
    const toDateClearSpy = sinon.spy(component.toDateFilter, 'clear');
    const statusClearSpy = sinon.spy(component.statusFilter, 'clear');
    component.disabled = true;

    component.clearFilters();
    component.resetFilters();
    component.applyFilters();

    expect(searchSpy.notCalled).to.be.true;
    expect(formClearSpy.notCalled).to.be.true;
    expect(facilityClearSpy.notCalled).to.be.true;
    expect(fromDateClearSpy.notCalled).to.be.true;
    expect(toDateClearSpy.notCalled).to.be.true;
    expect(statusClearSpy.notCalled).to.be.true;

  });
});
