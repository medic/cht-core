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
    expect(component.filters.length).to.equal(5);
    expect(component.filterCount).to.be.empty;
    expect(component.isOpen).to.be.false;
  }));

  it('should emit search when applying filters', () => {
    const searchSpy = sinon.spy(component.search, 'emit');

    component.applyFilters();
    expect(searchSpy.calledOnce).to.be.true;
    expect(searchSpy.args[0]).to.deep.equal([undefined]);

    component.applyFilters(true);
    expect(searchSpy.callCount).to.equal(2);
    expect(searchSpy.args[1]).to.deep.equal([true]);
  });

  it('should clear all filters', () => {
    const clearSpies = [];
    component.filters.forEach(filter => clearSpies.push(sinon.spy(filter, 'clear')));

    component.clearFilters();

    expect(clearSpies.length).to.equal(5);
    clearSpies.forEach(clearSpy => expect(clearSpy.calledOnce).to.be.true);
  });

  it('should clear some filters', () => {
    const clearSpies = {};
    const shouldClear = [ 'fromDateFilter', 'placeFilter', 'statusFilter' ];
    const shouldNotClear = [ 'toDateFilter', 'formFilter' ];
    component.filters.forEach(filter => clearSpies[filter.fieldId] = sinon.spy(filter, 'clear'));

    component.clearFilters(shouldClear);

    shouldClear.forEach(fieldId => expect(clearSpies[fieldId].calledOnce).to.be.true);
    shouldNotClear.forEach(fieldId => expect(clearSpies[fieldId].notCalled).to.be.true);
  });

  it('should count selected items', () => {
    const countSelectedSpies = [];
    component.filters.forEach(filter => countSelectedSpies.push(sinon.spy(filter, 'countSelected')));
    const selectedForms = new Set();
    selectedForms.add('pregnancy_form');
    selectedForms.add('u5_assessment');
    component.formTypeFilter.inlineFilter.selected = selectedForms;
    component.fromDateFilter.date.from = new Date();
    const expectedCount = {
      total: 3,
      fromDateFilter: 1,
      toDateFilter: 0,
      formFilter: 2,
      statusFilter: 0,
      placeFilter: 0,
    };

    component.countSelected();

    expect(countSelectedSpies.length).to.equal(5);
    countSelectedSpies.forEach(spy => expect(spy.calledOnce).to.be.true);
    expect(component.filterCount).to.deep.equal(expectedCount);
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({ filterCount: expectedCount });
  });

  it('should reset filters', () => {
    const searchSpy = sinon.spy(component.search, 'emit');
    const clearSpies = [];
    component.filters.forEach(filter => clearSpies.push(sinon.spy(filter, 'clear')));

    component.resetFilters();

    expect(clearSpies.length).to.equal(5);
    clearSpies.forEach(clearSpy => expect(clearSpy.calledOnce).to.be.true);
    expect(globalActions.clearFilters.calledOnce).to.be.true;
    expect(searchSpy.calledOnce).to.be.true;
    expect(searchSpy.args[0]).to.deep.equal([undefined]);
  });

  it('should toggle sidebar filter', () => {
    component.toggleSidebarFilter();
    component.toggleSidebarFilter(true);
    component.toggleSidebarFilter();

    expect(globalActions.setSidebarFilter.calledThrice).to.be.true;
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({ isOpen: true });
    expect(globalActions.setSidebarFilter.args[1][0]).to.deep.equal({ isOpen: true });
    expect(globalActions.setSidebarFilter.args[2][0]).to.deep.equal({ isOpen: false });
    expect(telemetryService.record.calledTwice).to.be.true;
  });

  it('should clear filters in the store on component destroy', () => {
    component.ngOnDestroy();

    expect(globalActions.clearSidebarFilter.calledOnce).to.be.true;
    expect(globalActions.clearFilters.calledOnce).to.be.true;
  });
});
