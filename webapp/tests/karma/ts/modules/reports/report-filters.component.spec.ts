import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { ReportsFiltersComponent } from '@mm-modules/reports/reports-filters.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { GlobalActions } from '@mm-actions/global';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { ResetFiltersComponent } from '@mm-components/filters/reset-filters/reset-filters.component';
import { MultiDropdownFilterComponent } from
  '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';

describe('Reports Filters Component', () => {
  let component: ReportsFiltersComponent;
  let fixture: ComponentFixture<ReportsFiltersComponent>;
  let searchFiltersService;

  beforeEach(async(() => {
    searchFiltersService = { init: sinon.stub() };
    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          ModalModule.forRoot(),
          RouterTestingModule,
          FormsModule,
          BsDropdownModule,
          BrowserAnimationsModule,
        ],
        declarations: [
          ReportsFiltersComponent,
          DateFilterComponent,
          FacilityFilterComponent,
          FormTypeFilterComponent,
          FreetextFilterComponent,
          StatusFilterComponent,
          ResetFiltersComponent,
          MultiDropdownFilterComponent,
        ],
        providers: [
          provideMockStore(),
          { provide: SearchFiltersService, useValue: searchFiltersService },
          { provide: PlaceHierarchyService, useValue: { get: sinon.stub().resolves([]) } },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsFiltersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize search filters service after view init', () => {
    searchFiltersService.init.resetHistory();
    component.ngAfterViewInit();
    expect(searchFiltersService.init.callCount).to.equal(1);
    expect(searchFiltersService.init.args[0]).to.deep.equal([component.freetextFilter]);
  });

  it('apply filters should emit search', () => {
    const searchSpy = sinon.spy(component.search, 'emit');
    component.applyFilters();
    expect(searchSpy.callCount).to.equal(1);
    expect(searchSpy.args[0]).to.deep.equal([undefined]);
    component.applyFilters(true);
    expect(searchSpy.callCount).to.equal(2);
    expect(searchSpy.args[1]).to.deep.equal([true]);
  });

  it('reset filters should reset all filters', () => {
    const clearFilters = sinon.stub(GlobalActions.prototype, 'clearFilters');
    const searchSpy = sinon.spy(component.search, 'emit');
    const formTypeClearSpy = sinon.spy(component.formTypeFilter, 'clear');
    const facilityClearSpy = sinon.spy(component.facilityFilter, 'clear');
    const dateClearSpy = sinon.spy(component.dateFilter, 'clear');
    const statusClearSpy = sinon.spy(component.statusFilter, 'clear');
    const freetextClearSpy = sinon.spy(component.freetextFilter, 'clear');

    component.resetFilters();
    expect(clearFilters.callCount).to.equal(1);
    expect(searchSpy.callCount).to.equal(1);
    expect(searchSpy.args[0]).to.deep.equal([undefined]);
    expect(formTypeClearSpy.callCount).to.equal(1);
    expect(facilityClearSpy.callCount).to.equal(1);
    expect(dateClearSpy.callCount).to.equal(1);
    expect(statusClearSpy.callCount).to.equal(1);
    expect(freetextClearSpy.callCount).to.equal(1);
  });
});
