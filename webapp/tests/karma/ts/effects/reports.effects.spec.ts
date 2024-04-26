import { provideMockActions } from '@ngrx/effects/testing';
import { fakeAsync, flush, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { concat, Observable, of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { Action } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';

import { Actions as ReportActionList, ReportsActions } from '@mm-actions/reports';
import { GlobalActions } from '@mm-actions/global';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { Selectors } from '@mm-selectors/index';
import { MarkReadService } from '@mm-services/mark-read.service';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ModalService } from '@mm-services/modal.service';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { DbService } from '@mm-services/db.service';
import { SearchService } from '@mm-services/search.service';
import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { VerifyReportComponent } from '@mm-modals/verify-report/verify-report.component';
import { AuthService } from '@mm-services/auth.service';
import { ServicesActions } from '@mm-actions/services';
import { PerformanceService } from '@mm-services/performance.service';

describe('Reports effects', () => {
  let effects:ReportsEffects;
  let actions$;
  let reportViewModelGeneratorService;
  let markReadService;
  let modalService;
  let toPromiseStub;
  let dbService;
  let router;
  let searchService;
  let store;
  let authService;
  let translateService;
  let performanceService;
  let stopPerformanceTrackStub;

  beforeEach(waitForAsync(() => {
    actions$ = new Observable<Action>();
    const mockedSelectors = [
      { selector: Selectors.getSelectMode, value: false },
      { selector: Selectors.getSelectedReport, value: undefined },
      { selector: Selectors.getSelectedReports, value: [] },
      { selector: Selectors.getListReport, value: {} },
      { selector: Selectors.getForms, value: [] },
      { selector: Selectors.getUnreadCount, value: {} },
    ];

    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub() };
    reportViewModelGeneratorService = { get: sinon.stub().resolves() };
    markReadService = { markAsRead: sinon.stub().resolves() };
    dbService = { get: sinon.stub(), put: sinon.stub() };
    router = { navigate: sinon.stub() };
    searchService = { search: sinon.stub() };
    authService = { has: sinon.stub() };
    translateService = { instant: sinon.stub().returnsArg(0) };
    toPromiseStub = sinon.stub();
    modalService = {
      show: sinon
        .stub()
        .returns({
          afterClosed: () => ({ toPromise: toPromiseStub }),
        }),
    };

    TestBed.configureTestingModule({
      declarations: [
        SendMessageComponent,
        EditReportComponent,
        VerifyReportComponent,
      ],
      imports: [
        EffectsModule.forRoot([ReportsEffects]),
      ],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ReportViewModelGeneratorService, useValue: reportViewModelGeneratorService },
        { provide: MarkReadService, useValue: markReadService },
        { provide: ModalService, useValue: modalService },
        { provide: DbService, useValue: { get: sinon.stub().returns(dbService)} },
        { provide: Router, useValue: router },
        { provide: SearchService, useValue: searchService },
        { provide: AuthService, useValue: authService },
        { provide: TranslateService, useValue: translateService },
        { provide: PerformanceService, useValue: performanceService },
      ],
    });

    effects = TestBed.inject(ReportsEffects);
    store = TestBed.inject(MockStore);
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  describe('selectReport', () => {
    it('should not be triggered by random actions', waitForAsync(() => {
      actions$ = of([
        ReportActionList.markReportRead(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.openReportContent({}),
      ]);
      effects.selectReport.subscribe();

      expect(reportViewModelGeneratorService.get.callCount).to.equal(0);
    }));

    it('should skip when no provided id', waitForAsync(() => {
      actions$ = of(ReportActionList.selectReport(''));
      effects.selectReportToOpen.subscribe();

      expect(reportViewModelGeneratorService.get.notCalled).to.be.true;
    }));

    it('should skip when no in select mode', waitForAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, false);
      store.refreshState();

      actions$ = of(ReportActionList.selectReport('reportID1'));
      effects.selectReport.subscribe();

      expect(reportViewModelGeneratorService.get.notCalled).to.be.true;
    }));

    it('should add report when it is not selected yet', fakeAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReports, []);
      store.refreshState();
      const updateSelectedReportsItemStub = sinon.stub(ReportsActions.prototype, 'updateSelectedReportsItem');
      const addSelectedReportStub = sinon.stub(ReportsActions.prototype, 'addSelectedReport');
      const setLoadingContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
      reportViewModelGeneratorService.get.onFirstCall().resolves({ _id: 'reportID1', doc: { _id: 'reportID1' } });

      actions$ = of(ReportActionList.selectReport('reportID1'));
      effects.selectReport.subscribe();
      flush();

      expect(updateSelectedReportsItemStub.notCalled).to.be.true;
      expect(reportViewModelGeneratorService.get.calledOnce).to.be.true;
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal([ 'reportID1' ]);
      expect(addSelectedReportStub.calledOnce).to.be.true;
      expect(addSelectedReportStub.args[0]).to.deep.equal([
        { _id: 'reportID1', doc: { _id: 'reportID1' }, expanded: false }
      ]);
      expect(setLoadingContentStub.calledOnce).to.be.true;
    }));

    it('should update report when it is selected', fakeAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReports, [{ _id: 'reportID1', doc: { _id: 'reportID1' } }]);
      store.refreshState();
      const updateSelectedReportsItemStub = sinon.stub(ReportsActions.prototype, 'updateSelectedReportsItem');
      const addSelectedReportStub = sinon.stub(ReportsActions.prototype, 'addSelectedReport');
      const setLoadingContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
      reportViewModelGeneratorService.get.resolves({ _id: 'reportID1', doc: { _id: 'reportID1' } });

      actions$ = of(ReportActionList.selectReport('reportID1'));
      effects.selectReport.subscribe();
      flush();

      expect(updateSelectedReportsItemStub.calledOnce).to.be.true;
      expect(updateSelectedReportsItemStub.args[0]).to.deep.equal([
        'reportID1',
        {
          _id: 'reportID1',
          doc: { _id: 'reportID1' },
          loading: false,
        },
      ]);
      expect(reportViewModelGeneratorService.get.calledOnce).to.be.true;
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal([ 'reportID1' ]);
      expect(addSelectedReportStub.notCalled).to.be.true;
      expect(setLoadingContentStub.calledOnce).to.be.true;
    }));

    it('should select report when more than one report is selected consecutively', fakeAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReports, [{ _id: 'reportID0', doc: { _id: 'reportID1' } }]);
      store.refreshState();
      const updateSelectedReportsItemStub = sinon.stub(ReportsActions.prototype, 'updateSelectedReportsItem');
      const addSelectedReportStub = sinon.stub(ReportsActions.prototype, 'addSelectedReport');
      const setLoadingContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
      reportViewModelGeneratorService.get.onFirstCall().resolves({ _id: 'reportID1', doc: { _id: 'reportID1' } });
      reportViewModelGeneratorService.get.onSecondCall().resolves({ _id: 'reportID2', doc: { _id: 'reportID2' } });

      // Two report selection observables are emitted, one right after the other
      actions$ = of(
        ReportActionList.selectReport('reportID1'),
        ReportActionList.selectReport('reportID2'),
      );
      effects.selectReport.subscribe();
      flush();

      expect(updateSelectedReportsItemStub.notCalled).to.be.true;
      expect(reportViewModelGeneratorService.get.calledTwice).to.be.true;
      expect(reportViewModelGeneratorService.get.args).to.deep.equal([[ 'reportID1' ], [ 'reportID2' ]]);
      expect(addSelectedReportStub.calledTwice).to.be.true;
      expect(addSelectedReportStub.args).to.deep.equal([
        [{ _id: 'reportID1', doc: { _id: 'reportID1' }, expanded: false }],
        [{ _id: 'reportID2', doc: { _id: 'reportID2' }, expanded: false }],
      ]);
      expect(setLoadingContentStub.calledTwice).to.be.true;
      expect(setLoadingContentStub.args).to.deep.equal([[ false ], [false]]);
    }));

    it('should unset selected when error is thrown', fakeAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReports, []);
      store.refreshState();
      const updateSelectedReportsItemStub = sinon.stub(ReportsActions.prototype, 'updateSelectedReportsItem');
      const addSelectedReportStub = sinon.stub(ReportsActions.prototype, 'addSelectedReport');
      const unsetSelectedStub = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      const consoleErrorMock = sinon.stub(console, 'error');
      reportViewModelGeneratorService.get.rejects({ some: 'error' });

      actions$ = of(ReportActionList.selectReport('reportID1'));
      effects.selectReport.subscribe();
      flush();

      expect(updateSelectedReportsItemStub.notCalled).to.be.true;
      expect(reportViewModelGeneratorService.get.calledOnce).to.be.true;
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal([ 'reportID1' ]);
      expect(addSelectedReportStub.notCalled).to.be.true;
      expect(unsetSelectedStub.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0][0]).to.equal('Error selecting report with select mode active');
    }));
  });

  describe('selectReportToOpen', () => {
    it('should not be triggered by random actions', waitForAsync(() => {
      actions$ = of([
        ReportActionList.markReportRead(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.openReportContent({}),
      ]);
      effects.selectReportToOpen.subscribe();

      expect(reportViewModelGeneratorService.get.notCalled).to.be.true;
    }));

    it('should skip when no provided id', waitForAsync(() => {
      actions$ = of(ReportActionList.selectReportToOpen({}));

      effects.selectReportToOpen.subscribe();

      expect(reportViewModelGeneratorService.get.notCalled).to.be.true;
    }));

    it('should load report when silent', fakeAsync(() => {
      const setLoadingShowContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      const unsetSelectedStub = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      reportViewModelGeneratorService.get.resolves({ _id: 'reportID', doc: { _id: 'reportID' } });

      actions$ = of(ReportActionList.selectReportToOpen({ reportId: 'reportID', silent: true }));
      effects.selectReportToOpen.subscribe();
      flush();

      expect(setLoadingShowContentStub.notCalled).to.be.true;
      expect(reportViewModelGeneratorService.get.calledOnce).to.be.true;
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal([ 'reportID' ]);
      expect(openReportContentStub.calledOnce).to.be.true;
      expect(openReportContentStub.args[0]).to.deep.equal([{ _id: 'reportID', doc: { _id: 'reportID' } }]);
      expect(unsetSelectedStub.notCalled).to.be.true;
      expect(performanceService.track.calledOnce).to.be.true;
    }));

    it('should load report when not silent', fakeAsync(() => {
      actions$ = of(ReportActionList.selectReportToOpen({ reportId: 'reportID', silent: false }));
      const setLoadingShowContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      const unsetSelectedStub = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      reportViewModelGeneratorService.get.resolves({ _id: 'reportID', doc: { _id: 'reportID' } });

      effects.selectReportToOpen.subscribe();
      flush();

      expect(setLoadingShowContentStub.calledOnce).to.be.true;
      expect(setLoadingShowContentStub.args[0]).to.deep.equal([ 'reportID' ]);
      expect(reportViewModelGeneratorService.get.calledOnce).to.be.true;
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal([ 'reportID' ]);
      expect(openReportContentStub.calledOnce).to.be.true;
      expect(openReportContentStub.args[0]).to.deep.equal([{ _id: 'reportID', doc: { _id: 'reportID' } }]);
      expect(unsetSelectedStub.notCalled).to.be.true;
      expect(performanceService.track.calledOnce).to.be.true;
    }));

    it('should set report when a new report is selected while still loading an initial report', fakeAsync(() => {
      const setLoadingShowContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      const unsetSelectedStub = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      reportViewModelGeneratorService.get.onFirstCall().resolves({ _id: 'reportID0', doc: { _id: 'reportID0' } });
      reportViewModelGeneratorService.get.onSecondCall().resolves({ _id: 'reportID1', doc: { _id: 'reportID1' } });

      // Two report selection observables are emitted, one right after the other
      actions$ = of(
        ReportActionList.selectReportToOpen({ reportId: 'reportID0', silent: true }),
        ReportActionList.selectReportToOpen({ reportId: 'reportID1', silent: true })
      );
      effects.selectReportToOpen.subscribe();
      flush();

      expect(setLoadingShowContentStub.notCalled).to.be.true;

      expect(reportViewModelGeneratorService.get.calledTwice).to.be.true;
      expect(reportViewModelGeneratorService.get.args).to.deep.equal([[ 'reportID0' ], [ 'reportID1' ]]);
      expect(openReportContentStub.calledTwice).to.be.true;
      expect(openReportContentStub.args).to.deep.equal([
        [{ _id: 'reportID0', doc: { _id: 'reportID0' } }],
        [{ _id: 'reportID1', doc: { _id: 'reportID1' } }],
      ]);
      expect(performanceService.track.calledTwice).to.be.true;
      expect(unsetSelectedStub.notCalled).to.be.true;
    }));

    it('should unset selected when error is thrown', fakeAsync(() => {
      actions$ = of(ReportActionList.selectReportToOpen({ reportId: 'report' }));
      const setLoadingShowContentStub = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      const unsetSelectedStub = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      const consoleErrorMock = sinon.stub(console, 'error');
      reportViewModelGeneratorService.get.rejects({ some: 'error' });

      effects.selectReportToOpen.subscribe();
      flush();

      expect(setLoadingShowContentStub.calledOnce).to.be.true;
      expect(setLoadingShowContentStub.args[0]).to.deep.equal([ 'report' ]);
      expect(reportViewModelGeneratorService.get.calledOnce).to.be.true;
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal([ 'report' ]);
      expect(openReportContentStub.notCalled).to.be.true;
      expect(unsetSelectedStub.calledOnce).to.be.true;
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0][0]).to.equal('Error selecting report to open');
    }));
  });

  describe('openReportContent', () => {
    let setSelectedReport;
    let setVerifyingReport;
    let setTitle;
    let markReportRead;
    let setRightActionBar;
    let settingSelected;

    beforeEach(() => {
      setSelectedReport = sinon.stub(ReportsActions.prototype, 'setSelectedReport');
      setVerifyingReport = sinon.stub(ReportsActions.prototype, 'setVerifyingReport');
      setTitle = sinon.stub(ReportsActions.prototype, 'setTitle');
      markReportRead = sinon.stub(ReportsActions.prototype, 'markReportRead');
      setRightActionBar = sinon.stub(ReportsActions.prototype, 'setRightActionBar');
      settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');
    });

    it('should not be triggered by random actions', waitForAsync(() => {
      actions$ = of([
        ReportActionList.markReportRead(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReport(''),
      ]);
      effects.openReportContent.subscribe();

      expect(setRightActionBar.callCount).to.equal(0);
    }));

    it('should call correct actions when not refreshing', () => {
      const model = {
        _id: 'report',
        doc: {
          _id: 'report',
          form: 'a-form',
          data: true,
        }
      };
      const expandedModel = { ...model, expanded: true };
      effects.trackOpenReport = { stop: stopPerformanceTrackStub };

      actions$ = of(ReportActionList.openReportContent(model));
      effects.openReportContent.subscribe();

      expect(setVerifyingReport.callCount).to.equal(1);
      expect(setVerifyingReport.args[0]).to.deep.equal([false]);
      expect(setSelectedReport.callCount).to.equal(1);
      expect(setSelectedReport.args[0]).to.deep.equal([expandedModel]);
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal([expandedModel]);
      expect(markReportRead.callCount).to.equal(1);
      expect(markReportRead.args[0]).to.deep.equal(['report']);
      expect(setRightActionBar.callCount).to.equal(1);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([]);
      expect(stopPerformanceTrackStub.calledOnce).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
        name: 'report_detail:a-form:load',
        recordApdex: true,
      });
    });

    it('should call correct actions when refreshing', () => {
      store.overrideSelector(Selectors.getSelectedReport, { _id: 'report' });
      store.refreshState();
      const model = {
        _id: 'report',
        doc: {
          _id: 'report',
          data: true,
        }
      };
      const expandedModel = { ...model, expanded: true };
      effects.trackOpenReport = { stop: stopPerformanceTrackStub };

      actions$ = of(ReportActionList.openReportContent(model));
      effects.openReportContent.subscribe();

      expect(setVerifyingReport.callCount).to.equal(0);
      expect(setSelectedReport.callCount).to.equal(1);
      expect(setSelectedReport.args[0]).to.deep.equal([expandedModel]);
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal([expandedModel]);
      expect(markReportRead.callCount).to.equal(1);
      expect(markReportRead.args[0]).to.deep.equal(['report']);
      expect(setRightActionBar.callCount).to.equal(1);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([]);
      expect(stopPerformanceTrackStub.notCalled).to.be.true;
    });
  });

  describe('setTitle', () => {
    let setTitle;
    beforeEach(() => {
      setTitle = sinon.stub(GlobalActions.prototype, 'setTitle');
    });

    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.markReportRead(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReportToOpen({}),
      ]);
      effects.setTitle.subscribe();
      expect(setTitle.callCount).to.equal(0);
    });

    it('should work when there are no forms with form', () => {
      const selected = {
        doc: {
          form: 'someForm',
        }
      };
      actions$ = of(ReportActionList.setTitle(selected));
      effects.setTitle.subscribe();
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal(['someForm']);
    });

    it('should work when there are no forms with formInternalId', () => {
      const selected = {
        formInternalId: 'internalID',
        doc: {
          form: 'someForm',
        },
      };
      actions$ = of(ReportActionList.setTitle(selected));
      effects.setTitle.subscribe();
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal(['internalID']);
    });

    it('should work with forms, but not matching report form', () => {
      const selected = {
        formInternalId: 'internalID',
        doc: {
          form: 'someForm',
        },
      };
      store.overrideSelector(Selectors.getForms, [{ code: 'form1' }, { code: 'form2' }]);
      actions$ = of(ReportActionList.setTitle(selected));
      effects.setTitle.subscribe();
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal(['internalID']);
    });

    it('should work with forms and matching report form', () => {
      const selected = {
        formInternalId: 'form1',
        doc: {
          form: 'someForm',
        },
      };
      store.overrideSelector(Selectors.getForms, [{ code: 'form1', name: 'form1name' }, { code: 'form2' }]);
      actions$ = of(ReportActionList.setTitle(selected));
      effects.setTitle.subscribe();
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal(['form1name']);
    });

    it('should work with forms and matching report form with form title', () => {
      const selected = {
        formInternalId: 'form1',
        doc: {
          form: 'someForm',
        },
      };
      store.overrideSelector(Selectors.getForms, [{ code: 'form1', title: 'form1title' }, { code: 'form2' }]);
      actions$ = of(ReportActionList.setTitle(selected));
      effects.setTitle.subscribe();
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal(['form1title']);
    });
  });

  describe('markRead', () => {
    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReportToOpen({}),
      ]);
      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(0);
    });

    it('should mark selected report as read and update unread count', () => {
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      const updateUnreadCount = sinon.stub(GlobalActions.prototype, 'updateUnreadCount');
      store.overrideSelector(Selectors.getListReport, { _id: 'report' });
      store.overrideSelector(Selectors.getUnreadCount, { report: 5 });
      actions$ = of(ReportActionList.markReportRead('report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(1);
      expect(markReadService.markAsRead.args[0]).to.deep.equal([[{ _id: 'report', read: true }]]);
      expect(updateReportsList.callCount).to.equal(1);
      expect(updateReportsList.args[0]).to.deep.equal([[{ _id: 'report', read: true }]]);
      expect(updateUnreadCount.callCount).to.equal(1);
      expect(updateUnreadCount.args[0][0]).to.deep.equal({ report: 4 });
    });

    it('should skip marking as read if already read and not update unread count', () => {
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      const updateUnreadCount = sinon.stub(GlobalActions.prototype, 'updateUnreadCount');
      store.overrideSelector(Selectors.getListReport, { _id: 'report', read: true });
      store.overrideSelector(Selectors.getUnreadCount, { report: 5 });
      actions$ = of(ReportActionList.markReportRead('report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(0);
      expect(updateReportsList.callCount).to.equal(0);
      expect(updateUnreadCount.callCount).to.equal(0);
    });

    it('should catch markread service errors', async () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      markReadService.markAsRead.rejects({ some: 'error' });
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      store.overrideSelector(Selectors.getListReport, { _id: 'my_report' });
      actions$ = of(ReportActionList.markReportRead('my_report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(1);
      expect(markReadService.markAsRead.args[0]).to.deep.equal([[{ _id: 'my_report', read: true }]]);
      expect(updateReportsList.callCount).to.equal(1);
      expect(updateReportsList.args[0]).to.deep.equal([[{ _id: 'my_report', read: true }]]);
      await Promise.resolve();  // wait markReadService.markAsRead stub to fail
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error marking read');
    });

    it('should mark read even if report is not found in list', () => {
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      store.overrideSelector(Selectors.getListReport, null);
      actions$ = of(ReportActionList.markReportRead('report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(1);
      expect(markReadService.markAsRead.args[0]).to.deep.equal([[{ _id: 'report', form: true }]]);
      expect(updateReportsList.callCount).to.equal(0);
    });

    it('should not update unread records count if unread count is falsy', () => {
      const updateUnreadCount = sinon.stub(GlobalActions.prototype, 'updateUnreadCount');
      store.overrideSelector(Selectors.getUnreadCount, null);
      actions$ = of(ReportActionList.markReportRead('report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(1);
      expect(updateUnreadCount.callCount).to.equal(0);
    });
  });

  describe('setRightActionBar', () => {
    let setRightActionBar;

    beforeEach(() => {
      setRightActionBar = sinon.stub(GlobalActions.prototype, 'setRightActionBar');
    });

    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReportToOpen({}),
      ]);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(0);
    });

    it('should set empty model when in select mode and no selected docs', waitForAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReportDoc, undefined);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([{}]);
    }));

    it('should set empty model when in select mode and selected docs', waitForAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReportDoc, { _id: 'doc' });
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([{}]);
    }));

    it('should set empty model when not in select mode and no selected docs', waitForAsync(() => {
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, undefined);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([{}]);
    }));

    it('should set correct model when not in select mode and selected doc without contact', waitForAsync(() => {
      const report = {
        _id: 'report',
        verified: false,
        content_type: 'xml',
      };
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, report);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0][0]).to.deep.include({
        verified: false,
        type: 'xml',
      });
    }));

    it('should set correct model when not in select mode and selected doc with false contact', waitForAsync(() => {
      const report = {
        _id: 'report',
        verified: 'true',
        content_type: 'xml',
        contact: false,
      };
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, report);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0][0]).to.deep.include({
        verified: 'true',
        type: 'xml',
      });
    }));

    it('should set correct model when not in select mode and selected doc with contact', fakeAsync(async () => {
      const report = {
        _id: 'report',
        verified: true,
        content_type: 'not_xml',
        contact: { _id: 'the_contact' },
      };
      dbService.get.resolves({ _id: 'the_contact', phone: '12345' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, report);
      store.overrideSelector(Selectors.getVerifyingReport, true);

      actions$ = of(ReportActionList.setRightActionBar);
      effects.setRightActionBar.subscribe();
      tick(); // wait for db request to fulfill
      expect(dbService.get.callCount).to.equal(1);
      expect(dbService.get.args[0]).to.deep.equal(['the_contact']);
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0][0]).to.deep.include({
        verified: true,
        type: 'not_xml',
        sendTo: { _id: 'the_contact', phone: '12345' },
        verifyingReport: true,
      });
    }));

    it('should catch db get errors', fakeAsync(async() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      const report = {
        _id: 'report',
        verified: 'something',
        content_type: 'sms', // not an actual content_type
        contact: { _id: 'non-existing' },
      };
      dbService.get.rejects({ error: 'boom' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, report);
      store.overrideSelector(Selectors.getVerifyingReport, false);

      actions$ = of(ReportActionList.setRightActionBar);
      effects.setRightActionBar.subscribe();
      flush(); // wait for db request to fulfill
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0][0]).to.deep.include({
        verified: 'something',
        type: 'sms',
        sendTo: undefined,
        verifyingReport: false,
      });
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error fetching contact for action bar');
    }));

    it('openSendMessageModal function should open correct modal', () => {
      const report = {};
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, report);
      store.overrideSelector(Selectors.getVerifyingReport, false);

      actions$ = of(ReportActionList.setRightActionBar);
      effects.setRightActionBar.subscribe();

      expect(setRightActionBar.callCount).to.equal(1);
      const openSendMessageModal = setRightActionBar.args[0][0].openSendMessageModal;
      expect(modalService.show.callCount).to.equal(0);
      openSendMessageModal('number');
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        SendMessageComponent,
        { data: { to: 'number' } },
      ]);
    });

    it('should catch modal show promise rejections', () => {
      const report = {};
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportDoc, report);
      store.overrideSelector(Selectors.getVerifyingReport, false);

      actions$ = of(ReportActionList.setRightActionBar);
      effects.setRightActionBar.subscribe();

      expect(setRightActionBar.callCount).to.equal(1);
      const openSendMessageModal = setRightActionBar.args[0][0].openSendMessageModal;
      expect(modalService.show.callCount).to.equal(0);
      openSendMessageModal('send to');
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        SendMessageComponent,
        { data: { to: 'send to' } },
      ]);
    });
  });

  describe('launchEditFacilityDialog', () => {
    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReportToOpen({}),
      ]);

      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(0);
    });

    it('should pass selected report doc to EditReport modal', () => {
      const selectedReport = { _id: 'report1', doc: { _id: 'report1', contact: { _id: 'contact' } } };
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { data: { report: { _id: 'report1', contact: { _id: 'contact' } } } },
      ]);
    });

    it('should catch modal rejections', waitForAsync(() => {
      const selectedReport = { _id: 'r', doc: { _id: 'r', contact: { _id: 'ct' } } };
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { data: { report: { _id: 'r', contact: { _id: 'ct' } } } },
      ]);
    }));

    it('should handle undefined selected reports', () => {
      store.overrideSelector(Selectors.getSelectedReport, undefined);
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { data: { report: undefined } },
      ]);
    });

    it('should handle empty selected reports', () => {
      store.overrideSelector(Selectors.getSelectedReport, {});
      store.refreshState();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { data: { report: undefined } },
      ]);
    });
  });

  describe('verifyReport', () => {
    let setSelectedReportDocProperty;
    let setSelectedReportFormattedProperty;

    beforeEach(() => {
      setSelectedReportDocProperty = sinon.stub(ReportsActions.prototype, 'setSelectedReportDocProperty');
      setSelectedReportDocProperty.callsFake(props => {
        store
          .select(Selectors.getSelectedReport)
          .pipe(take(1))
          .subscribe(selectedReport => {
            selectedReport = {
              ...selectedReport,
              doc: { ...selectedReport.doc, ...props },
            };
            store.overrideSelector(Selectors.getSelectedReport, selectedReport);
            store.refreshState();
          });
      });
      setSelectedReportFormattedProperty = sinon
        .stub(ReportsActions.prototype, 'setSelectedReportFormattedProperty');
      sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');
    });

    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReportToOpen({}),
      ]);

      effects.verifyReport.subscribe();
      expect(authService.has.callCount).to.equal(0);
    });

    it('should minify report contact before saving and use latest rev', fakeAsync(() => {
      const selectedReport = {
        _id: 'report',
        doc: {
          _id: 'report',
          _rev: 2,
          contact: {
            parent: {
              type: 'health_center',
              is_name_generated: 'false',
              name: 'health center',
              external_id: '',
              notes: '',
              contact: {
                type: 'person',
                name: 'contact',
                short_name: '',
                date_of_birth: '1990-02-01',
                date_of_birth_method: '',
                ephemeral_dob: {
                  dob_calendar: '1990-02-01',
                  dob_method: '',
                  ephemeral_months: '7',
                  ephemeral_years: '2021',
                  dob_approx: '2021-07-06',
                  dob_raw: '1990-02-01',
                  dob_iso: '1990-02-01'
                },
                sex: 'female',
                phone: '+33612345678',
                phone_alternate: '',
                role: 'patient',
                external_id: '',
                notes: '',
                meta: {
                  created_by: 'admin',
                  created_by_person_uuid: '',
                  created_by_place_uuid: ''
                },
                reported_date: 1625563997559,
                patient_id: '64038',
                _id: 'contact',
                _rev: 2
              },
              geolocation: '',
              meta: {
                created_by: 'admin',
                created_by_person_uuid: '',
                created_by_place_uuid: ''
              },
              reported_date: 1625561218242,
              place_id: '34435',
              _id: 'parent',
              _rev: 4
            },
            type: 'person',
            name: 'contact',
            short_name: '',
            date_of_birth: '1990-02-01',
            date_of_birth_method: '',
            ephemeral_dob: {
              dob_calendar: '1990-02-01',
              dob_method: '',
              ephemeral_months: '7',
              ephemeral_years: '2021',
              dob_approx: '2021-07-06',
              dob_raw: '1990-02-01',
              dob_iso: '1990-02-01'
            },
            sex: 'female',
            phone: '+33612345678',
            phone_alternate: '',
            role: 'patient',
            external_id: '',
            notes: '',
            meta: {
              created_by: 'admin',
              created_by_person_uuid: '',
              created_by_place_uuid: ''
            },
            reported_date: 1625563997559,
            patient_id: '64038',
            _id: 'contact',
            _rev: 2
          },
        },
      };
      authService.has.resolves(true);
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();

      sinon.stub(Date, 'now').returns(1000); // using faketimers breaks fakeAsync's tick :(
      dbService.put.resolves();
      dbService.get.resolves({ _id: 'report', _rev: 3, contact: { _id: 'contact', parent: { _id: 'parent' } } });

      actions$ = of(ReportActionList.verifyReport(false));
      effects.verifyReport.subscribe();

      tick();

      expect(dbService.put.callCount).to.equal(1);
      expect(dbService.put.args[0]).to.deep.equal([{
        _id: 'report',
        _rev: 3,
        contact: { _id: 'contact', parent: { _id: 'parent' } },
        verified: false,
        verified_date: 1000,
      }]);
    }));

    it('should allow selecting a different report while completing verification', fakeAsync(() => {
      const selectedReport = {
        _id: 'report',
        doc: {
          _id: 'report',
          _rev: 2,
          contact: { _id: 'contact', name: 'name', parent: { _id: 'parent', type: 'clinic' } },
        },
      };
      authService.has.resolves(true);
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();

      sinon.stub(Date, 'now').returns(1000); // using faketimers breaks fakeAsync's tick :(
      // Getting the report from the db causes a new report to be selected
      dbService.get.callsFake(() => {
        actions$ = concat(actions$, of(ReportActionList.selectReportToOpen({ reportId: 'report1' })));
        return Promise.resolve({ _id: 'report', _rev: 3, contact: { _id: 'contact', parent: { _id: 'parent' } } });
      });
      // Updating the report causes it to be re-selected
      dbService.put.callsFake(() => {
        actions$ = concat(actions$, of(ReportActionList.selectReportToOpen({ reportId: 'report' })));
      });

      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      // Update the selected report when openReportContent is called
      openReportContentStub.callsFake(data => {
        const { _id } = data;
        store.overrideSelector(Selectors.getSelectedReport, { _id });
        store.refreshState();
      });
      reportViewModelGeneratorService.get.withArgs('report').resolves({_id: 'report', model: true});
      reportViewModelGeneratorService.get.withArgs('report1').resolves({_id: 'report1', model: true});
      reportViewModelGeneratorService.get.withArgs('report2').resolves({_id: 'report2', model: true});

      // Assert that properties are only set on report (not report1 or report2)
      setSelectedReportDocProperty.callsFake(props => {
        store
          .select(Selectors.getSelectedReport)
          .pipe(take(1))
          .subscribe(selectedReport => {
            expect(selectedReport._id).to.equal('report');
            selectedReport = {
              ...selectedReport,
              doc: { ...selectedReport.doc, ...props },
            };
            store.overrideSelector(Selectors.getSelectedReport, selectedReport);
            store.refreshState();
          });
      });
      setSelectedReportFormattedProperty.callsFake(() => {
        store
          .select(Selectors.getSelectedReport)
          .pipe(take(1))
          .subscribe(selectedReport => {
            expect(selectedReport._id).to.equal('report');
          });
      });

      // Trigger report verification
      actions$ = of(ReportActionList.verifyReport(false));
      effects.verifyReport.subscribe();
      tick();

      // Change the selected report before the re-selection from the verification has completed
      actions$ = concat(actions$, of(ReportActionList.selectReportToOpen({ reportId: 'report2' })));
      effects.selectReportToOpen.subscribe();
      tick();

      expect(dbService.put.callCount).to.equal(1);
      expect(dbService.put.args[0]).to.deep.equal([{
        _id: 'report',
        _rev: 3,
        contact: { _id: 'contact', parent: { _id: 'parent' } },
        verified: false,
        verified_date: 1000,
      }]);

      expect(reportViewModelGeneratorService.get.callCount).to.equal(3);
      expect(reportViewModelGeneratorService.get.args).to.deep.equal([['report1'], ['report'], ['report2']]);
      expect(openReportContentStub.calledThrice).to.be.true;
      expect(openReportContentStub.args).to.deep.equal([
        [{ _id: 'report1', model: true }],
        [{ _id: 'report', model: true }],
        [{ _id: 'report2', model: true }],
      ]);

      // Make sure we only end up setting the data we expect onto the report
      expect((<any>ReportsActions.prototype.setSelectedReportDocProperty).callCount).to.equal(1);
      expect((<any>ReportsActions.prototype.setSelectedReportDocProperty).args[0]).to.deep.equal([
        'report',
        { verified: false, verified_date: 1000 },
      ]);
      expect((<any>ReportsActions.prototype.setSelectedReportFormattedProperty).callCount).to.equal(1);
      expect((<any>ReportsActions.prototype.setSelectedReportFormattedProperty).args[0]).to.deep.equal([
        'report',
        { oldVerified: undefined, verified: false },
      ]);
    }));

    it('should launch modal with correct params on invalid', fakeAsync(() => {
      const selectedReport = {
        _id: 'report',
        doc: { _id: 'report' },
      };
      authService.has.resolves(false);
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();

      actions$ = of(ReportActionList.verifyReport(false));
      effects.verifyReport.subscribe();

      tick();

      expect(dbService.get.callCount).to.equal(0);
      expect(dbService.put.callCount).to.equal(0);
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        VerifyReportComponent,
        { data: { proposedVerificationState: 'reports.verify.invalid' } }
      ]);
    }));

    it('should launch modal with correct params on valid', fakeAsync(() => {
      const selectedReport = { _id: 'report', doc: { _id: 'report' } };
      authService.has.resolves(false);
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();

      actions$ = of(ReportActionList.verifyReport(true));
      effects.verifyReport.subscribe();

      tick();

      expect(dbService.get.callCount).to.equal(0);
      expect(dbService.put.callCount).to.equal(0);
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        VerifyReportComponent,
        { data: { proposedVerificationState: 'reports.verify.valid' } }
      ]);
    }));

    it('should catch db put errors', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      const selectedReport = { _id: 'report', doc: { _id: 'report' } };
      authService.has.resolves(true);
      store.overrideSelector(Selectors.getSelectedReport, selectedReport);
      store.refreshState();

      actions$ = of(ReportActionList.verifyReport(true));
      effects.verifyReport.subscribe();
      dbService.get.resolves({});
      dbService.put.rejects({ some: 'error' });

      tick();

      expect(dbService.get.callCount).to.equal(1);
      expect(dbService.put.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error verifying message');
    }));

    const scenarios = [
      //User scenarios with permission to edit
      { canEdit: true, initial: undefined, setTo: true, expectVerified: true, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: undefined, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: true, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: false, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: true, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: undefined, expectVerified: undefined, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: undefined, expectVerified: undefined, expectPost: true, expectedDate: 0 },

      // User scenarios without permission to edit
      { canEdit: false, initial: undefined, setTo: false, expectVerified: false, confirm: true,
        expectPost: true, expectedDate: 0 },
      { canEdit: false, initial: undefined, setTo: true, expectVerified: undefined, confirm: false,
        expectPost: false, expectedDate: undefined },
      { canEdit: false, initial: true, setTo: false, expectVerified: true, expectPost: false, expectedDate: 0 },
      { canEdit: false, initial: false, setTo: false, expectVerified: false, expectPost: false, expectedDate: 0 },
    ];

    scenarios.forEach(scenario => {
      const { canEdit, initial, setTo, confirm, expectPost, expectedDate, expectVerified  } = scenario;
      const test = `user ${canEdit ? 'can' : 'cannot'} edit, ${initial}->${setTo} yields verified:${expectVerified}`;

      it(test, fakeAsync(() => {
        const selectedReport = {
          _id: 'def',
          doc: { _id: 'def', name: 'hello', form: 'P', verified: initial },
        };

        sinon.stub(Date, 'now').returns(0); // using faketimers breaks fakeAsync's tick :(

        canEdit ? authService.has.resolves(true) : authService.has.resolves(false);
        confirm ? toPromiseStub.resolves(true) :  toPromiseStub.resolves(false);
        dbService.put.resolves();
        dbService.get.resolves({ _id: 'def', name: 'hello', _rev: '1', form: 'P' });
        store.overrideSelector(Selectors.getSelectedReport, selectedReport);
        store.refreshState();

        actions$ = of(ReportActionList.verifyReport(setTo));
        effects.verifyReport.subscribe();
        tick(0, { processNewMacroTasksSynchronously: true });

        expect(modalService.show.callCount).to.equal(confirm === undefined ? 0 : 1);

        if (expectPost) {
          expect(dbService.put.callCount).to.equal(1);
          expect(dbService.put.args[0]).to.deep.equal([{
            _id: 'def',
            name: 'hello',
            form: 'P',
            _rev: '1',
            verified_date: expectedDate,
            verified: expectVerified,
          }]);
          expect((<any>ReportsActions.prototype.setSelectedReportDocProperty).callCount).to.equal(1);
          expect((<any>ReportsActions.prototype.setSelectedReportDocProperty).args[0]).to.deep.equal([
            'def',
            { verified: expectVerified, verified_date: expectedDate },
          ]);
          expect((<any>ServicesActions.prototype.setLastChangedDoc).callCount).to.equal(1);
          expect((<any>ServicesActions.prototype.setLastChangedDoc).args[0]).to.deep.equal([
            { _id: 'def', name: 'hello', form: 'P', verified: initial },
          ]);
        } else {
          expect(dbService.put.called).to.be.false;
          expect((<any>ReportsActions.prototype.setSelectedReportDocProperty).callCount).to.equal(0);
          expect((<any>ServicesActions.prototype.setLastChangedDoc).callCount).to.equal(0);
        }
      }));
    });
  });
});
