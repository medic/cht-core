import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

import { ReportsComponent } from '@mm-modules/reports/reports.component';
import { ChangesService } from '@mm-services/changes.service';
import { SearchService } from '@mm-services/search.service';
import { AddReadStatusService } from '@mm-services/add-read-status.service';
import { ReportsFiltersComponent } from '@mm-modules/reports/reports-filters.component';
import { ReportsContentComponent } from '@mm-modules/reports/reports-content.component';
import { SettingsService } from '@mm-services/settings.service';
import { ReportsActions } from '@mm-actions/reports';
import { Selectors } from '@mm-selectors/index';
import { ComponentsModule } from '@mm-components/components.module';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { TourService } from '@mm-services/tour.service';
import { SessionService } from '@mm-services/session.service';
import { NavigationService } from '@mm-services/navigation.service';
import { AuthService } from '@mm-services/auth.service';
import { ReportsSidebarFilterComponent } from '@mm-modules/reports/reports-sidebar-filter.component';
import { SearchBarComponent } from '@mm-components/search-bar/search-bar.component';
import { TelemetryService } from '@mm-services/telemetry.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { GlobalActions } from '@mm-actions/global';
import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';

describe('Reports Component', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let changesService;
  let addReadStatusService;
  let sessionService;
  let searchService;
  let listContains;
  let authService;
  let datePipe;
  let responsiveService;
  let modalService;
  let userContactService;

  const userContactGrandparent = { _id: 'grandparent' };
  const userContactDoc = {
    _id: 'user',
    parent: {
      _id: 'parent',
      name: 'parent',
      parent: userContactGrandparent,
    },
  };

  beforeEach(waitForAsync(() => {
    listContains = sinon.stub();
    const mockedSelectors = [
      { selector: Selectors.getSelectedReport, value: undefined },
      { selector: Selectors.getSelectedReports, value: [] },
      { selector: Selectors.getReportsList, value: [] },
      { selector: Selectors.listContains, value: listContains },
      { selector: Selectors.getForms, value: [] },
      { selector: Selectors.getFilters, value: {} },
      { selector: Selectors.getShowContent, value: false },
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoEditedStatus, value: false },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getSidebarFilter, value: {} },
    ];
    const tourServiceMock = { startIfNeeded: () => {} };
    (<any>$.fn).daterangepicker = sinon.stub().returns({ on: sinon.stub() });

    searchService = { search: sinon.stub().resolves([]) };
    changesService = { subscribe: sinon.stub().resolves(of({})) };
    addReadStatusService = { updateReports: sinon.stub().resolvesArg(0) };
    authService = { has: sinon.stub().resolves(false) };
    sessionService = {
      isDbAdmin: sinon.stub().returns(false),
      isOnlineOnly: sinon.stub().returns(false)
    };
    datePipe = { transform: sinon.stub() };
    responsiveService = { isMobile: sinon.stub() };
    modalService = { show: sinon.stub().resolves() };
    userContactService = {
      get: sinon.stub().resolves(userContactDoc),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          ComponentsModule,
          BrowserAnimationsModule,
          BsDropdownModule.forRoot(),
        ],
        declarations: [
          ReportsComponent,
          ReportsFiltersComponent,
          ReportsSidebarFilterComponent,
          SearchBarComponent,
          ReportsContentComponent,
          NavigationComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ChangesService, useValue: changesService },
          { provide: AddReadStatusService, useValue: addReadStatusService },
          { provide: SearchService, useValue: searchService },
          // Needed because of ngx-translate provider's constructor.
          { provide: SettingsService, useValue: {} },
          // Needed because of facility filter
          { provide: PlaceHierarchyService, useValue: { get: sinon.stub().resolves() } },
          // Needed because of Reports Sidebar Filter
          { provide: TelemetryService, useValue: { record: sinon.stub() } },
          { provide: TourService, useValue: tourServiceMock },
          { provide: SessionService, useValue: sessionService },
          { provide: UserContactService, useValue: userContactService },
          { provide: NavigationService, useValue: {} },
          { provide: AuthService, useValue: authService },
          { provide: ResponsiveService, useValue: responsiveService },
          { provide: ModalService, useValue: modalService },
          { provide: DatePipe, useValue: datePipe },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create ReportsComponent', () => {
    expect(component).to.exist;
    expect(component.isSidebarFilterOpen).to.be.false;
  });

  it('should watch for changes, set selected reports, search and set search filter', async () => {
    changesService.subscribe.resetHistory();
    searchService.search.resetHistory();
    authService.has.resetHistory();
    const setSelectModeStub = sinon.stub(GlobalActions.prototype, 'setSelectMode');

    const spySubscriptionsAdd = sinon.spy(component.subscription, 'add');

    component.ngOnInit();
    await component.ngAfterViewInit();

    expect(component.isSidebarFilterOpen).to.be.false;
    expect(component.selectModeAvailable).to.be.false;
    expect(authService.has.calledTwice).to.be.true;
    expect(authService.has.args[0][0]).to.have.members([ 'can_edit', 'can_bulk_delete_reports' ]);
    expect(authService.has.args[1][0]).to.equal('can_view_old_filter_and_search');
    expect(setSelectModeStub.calledOnce).to.be.true;
    expect(setSelectModeStub.args[0]).to.have.members([ false ]);
    expect(searchService.search.calledOnce).to.be.true;
    expect(changesService.subscribe.calledOnce).to.be.true;
    expect(spySubscriptionsAdd.calledThrice).to.be.true;
  });

  it('listTrackBy() should return unique identifier', () => {
    const report = { _id: 'report', _rev: 'the rev', read: true, some: 'data', fields: {} };
    const otherReport = { _id: 'report2', _rev: 'the other rev', read: false, some: 'otherdata', fields: {} };
    const unselected = { _id: 'theid', _rev: 'rev', read: true, selected: false };
    const selected = { _id: 'selected', _rev: 'rv', read: false, selected: true };

    expect(component.listTrackBy(0, report)).to.equal('reportthe revtrueundefined');
    expect(component.listTrackBy(1, otherReport)).to.equal('report2the other revfalseundefined');
    expect(component.listTrackBy(2, unselected)).to.equal('theidrevtruefalse');
    expect(component.listTrackBy(3, selected)).to.equal('selectedrvfalsetrue');
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');
    component.ngOnDestroy();
    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  describe('selectAllReports', () => {
    it('should select all when not all reports have been selected yet', () => {
      const selectAllStub = sinon.stub(ReportsActions.prototype, 'selectAll');
      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'selected3' }];

      component.selectAllReports();

      expect(selectAllStub.calledOnce).to.be.true;
    });

    it('should not call select all when all reports have been selected', () => {
      const selectAllStub = sinon.stub(ReportsActions.prototype, 'selectAll');
      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'selected3' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'selected3' }];

      component.selectAllReports();

      expect(selectAllStub.notCalled).to.be.true;
    });
  });

  describe('deselectAllReports', () => {
    it('should deselect all when all reports have been selected', () => {
      const deselectAllStub = sinon.stub(ReportsActions.prototype, 'deselectAll');
      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'selected3' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'selected3' }];

      component.deselectAllReports();

      expect(deselectAllStub.calledOnce).to.be.true;
    });

    it('should deselect all even when not all reports have been selected yet', () => {
      const deselectAllStub = sinon.stub(ReportsActions.prototype, 'deselectAll');
      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'selected3' }];

      component.deselectAllReports();

      expect(deselectAllStub.calledOnce).to.be.true;
    });
  });

  describe('selectReport', () => {
    let addSelectedReport;
    let selectReport;
    let removeSelectedReport;

    beforeEach(() => {
      addSelectedReport = sinon.stub(ReportsActions.prototype, 'addSelectedReport');
      selectReport = sinon.stub(ReportsActions.prototype, 'selectReport');
      removeSelectedReport = sinon.stub(ReportsActions.prototype, 'removeSelectedReport');
    });

    it('should not crash when called without report (for some reason)', () => {
      component.selectReport(undefined);

      expect(addSelectedReport.callCount).to.equal(0);
      expect(selectReport.callCount).to.equal(0);
      expect(removeSelectedReport.callCount).to.equal(0);
    });

    it('should not select when report does not have id', () => {
      component.selectMode = false;
      component.selectReport({ _id: '' });
      component.selectMode = true;
      component.selectReport({ _id: '' });

      expect(addSelectedReport.notCalled).to.be.true;
      expect(selectReport.notCalled).to.be.true;
      expect(removeSelectedReport.notCalled).to.be.true;
    });

    it('should add selected report if not already selected', () => {
      component.selectMode = true;
      component.selectedReports = null;

      component.selectReport({ _id: 'rid' });

      expect(addSelectedReport.callCount).to.equal(1);
      expect(addSelectedReport.args[0]).to.deep.equal([{ _id: 'rid' }]);
      expect(selectReport.callCount).to.equal(1);
      expect(selectReport.args[0]).to.deep.equal([{ _id: 'rid' }]);
      expect(removeSelectedReport.callCount).to.equal(0);
    });

    it('should add selected report if not already selected when there are some selected reports', () => {
      component.selectMode = true;
      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }];

      component.selectReport({ _id: 'rid' });

      expect(addSelectedReport.callCount).to.equal(1);
      expect(addSelectedReport.args[0]).to.deep.equal([{ _id: 'rid' }]);
      expect(selectReport.callCount).to.equal(1);
      expect(selectReport.args[0]).to.deep.equal([{ _id: 'rid' }]);
      expect(removeSelectedReport.callCount).to.equal(0);
    });

    it('should remove selected report if already selected', () => {
      component.selectMode = true;
      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }, { _id: 'rid' }];

      component.selectReport({ _id: 'rid' });
      expect(addSelectedReport.callCount).to.equal(0);
      expect(selectReport.callCount).to.equal(0);
      expect(removeSelectedReport.callCount).to.equal(1);
      expect(removeSelectedReport.args[0]).to.deep.equal([ { _id: 'rid' }, undefined ]);
    });
  });

  describe('bulkDeleteReports', () => {
    it('should not open modal when there are no selected reports', () => {
      component.selectedReports = [];

      component.bulkDeleteReports();

      expect(modalService.show.notCalled).to.be.true;
    });

    it('should open modal when there are selected reports', () => {
      component.selectedReports = [{ _id: 'selected1' }];

      component.bulkDeleteReports();

      expect(modalService.show.calledOnce).to.be.true;
      expect(modalService.show.args[0]).to.have.deep.members([
        BulkDeleteConfirmComponent,
        { initialState: { model: { docs: [{ _id: 'selected1' }], type: 'reports' } } }
      ]);
    });
  });

  describe('verifyMultiSelect', () => {
    it('should return false when no in select mode and no selected reports', () => {
      component.selectMode = false;
      component.selectedReports = [];

      expect(component.verifyMultiselect()).to.be.false;
    });

    it('should verify if some reports are selected', () => {
      component.selectMode = true;
      component.selectedReports = [{ _id: 'selected1' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }];

      expect(component.verifyMultiselect(true)).to.be.true;

      component.selectedReports = [];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }];

      expect(component.verifyMultiselect(true)).to.be.false;

      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }];

      expect(component.verifyMultiselect()).to.be.true;
    });

    it('should verify if all reports are selected', () => {
      component.selectMode = true;
      component.selectedReports = [{ _id: 'selected1' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }];

      expect(component.verifyMultiselect()).to.be.false;

      component.selectedReports = [];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }];

      expect(component.verifyMultiselect()).to.be.false;

      component.selectedReports = [{ _id: 'selected1' }, { _id: 'selected2' }];
      component.reportsList = [{ _id: 'selected1' }, { _id: 'selected2' }];

      expect(component.verifyMultiselect()).to.be.true;
    });
  });

  describe('Changes listener', () => {
    it('filters reports', () => {
      expect(changesService.subscribe.callCount).to.equal(1);
      const changesFilter = changesService.subscribe.args[0][0].filter;
      const change = { doc: { form: 'something' } };
      expect(!!changesFilter(change)).to.equal(true);
    });

    it('filters deletions', () => {
      listContains.returns(true);
      const changesFilter = changesService.subscribe.args[0][0].filter;
      const change = { deleted: true, id: 'some_id' };
      expect(!!changesFilter(change)).to.equal(true);
      expect(listContains.callCount).to.equal(1);
      expect(listContains.args[0]).to.deep.equal(['some_id']);
    });

    it('filters everything else', () => {
      const changesFilter = changesService.subscribe.args[0][0].filter;
      expect(!!changesFilter({ doc: { some: 'thing' } })).to.equal(false);
    });

    it('removes deleted reports from the list', () => {
      searchService.search.resetHistory();
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const removeReportFromList = sinon.stub(ReportsActions.prototype, 'removeReportFromList');

      changesCallback({ deleted: true, id: 'id' });
      expect(removeReportFromList.callCount).to.equal(1);
      expect(removeReportFromList.args[0]).to.deep.equal([{ _id: 'id' }]);
      expect(searchService.search.callCount).to.equal(0);
    });

    it('refreshes list', () => {
      searchService.search.resetHistory();
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const removeReportFromList = sinon.stub(ReportsActions.prototype, 'removeReportFromList');

      changesCallback({ doc: { _id: 'id' } });
      expect(removeReportFromList.callCount).to.equal(0);
      expect(searchService.search.callCount).to.equal(1);
    });
  });

  describe('Reports breadcrumbs', () => {
    const reports = [
      {
        _id: '88b0dfff-4a82-4202-abea-d0cabe5aa9bd',
        lineage: [ 'St Elmos Concession', 'Chattanooga Village', 'CHW Bettys Area' ],
      },
      {
        _id: 'a86f238a-ad81-4780-9552-c7248864d1b2', lineage:  [ 'Chattanooga Village', 'CHW Bettys Area', null, null],
      },
      {
        _id: 'd2da792d-e7f1-48b3-8e53-61d331d7e899', lineage: [ 'Chattanooga Village' ],
      },
      {
        _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba357229', lineage: [ 'CHW Bettys Area'],
      },
      {
        _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba357229', lineage: [],
      },
      {
        _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba965525',
      },
    ];
    const offlineUserContactDoc = {
      _id: 'user',
      parent: {
        _id: 'parent',
        name: 'CHW Bettys Area',
        parent: userContactGrandparent,
      },
    };

    let updateReportsListStub;

    beforeEach(() => {
      updateReportsListStub = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      searchService.search.resolves(reports);
    });

    it('should not change the reports lineage if user is online only', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(true);
      const expectedReports = [
        {
          _id: '88b0dfff-4a82-4202-abea-d0cabe5aa9bd',
          lineage: [ 'St Elmos Concession', 'Chattanooga Village', 'CHW Bettys Area' ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'a86f238a-ad81-4780-9552-c7248864d1b2',
          lineage:  [ 'Chattanooga Village', 'CHW Bettys Area', null, null ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'd2da792d-e7f1-48b3-8e53-61d331d7e899',
          lineage: [ 'Chattanooga Village' ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba357229',
          lineage: [ 'CHW Bettys Area' ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba357229',
          lineage: [],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba965525',
          lineage: undefined,
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,

        },
      ];

      component.ngOnInit();
      component.ngAfterViewInit();
      flush();

      expect(updateReportsListStub.callCount).to.equal(1);
      expect(updateReportsListStub.args[0]).to.deep.equal([ expectedReports ]);
    }));

    it('should remove current level from reports lineage when user is offline', fakeAsync(() => {
      userContactService.get.resolves(offlineUserContactDoc);
      sessionService.isOnlineOnly.returns(false);
      const expectedReports = [
        {
          _id: '88b0dfff-4a82-4202-abea-d0cabe5aa9bd',
          lineage: [ 'St Elmos Concession', 'Chattanooga Village' ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'a86f238a-ad81-4780-9552-c7248864d1b2',
          lineage:  [ 'Chattanooga Village' ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'd2da792d-e7f1-48b3-8e53-61d331d7e899',
          lineage: [ 'Chattanooga Village' ],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba357229',
          lineage: [],
          heading: 'report.subject.unknown',
          icon: undefined,
          summary: undefined,
          unread: true,
        },
        {
          _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba357229',
          heading: 'report.subject.unknown',
          icon: undefined,
          lineage: [],
          summary: undefined,
          unread: true,
        },
        {
          _id: 'ee21ea15-1ebb-4d6d-95ea-7073ba965525',
          heading: 'report.subject.unknown',
          icon: undefined,
          lineage: undefined,
          summary: undefined,
          unread: true,
        },
      ];

      component.ngOnInit();
      component.ngAfterViewInit();
      flush();

      expect(updateReportsListStub.callCount).to.equal(1);
      expect(updateReportsListStub.args[0]).to.deep.equal([ expectedReports ]);
    }));

  });

});
