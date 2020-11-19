import { provideMockActions } from '@ngrx/effects/testing';
import { async, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
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
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { DbService } from '@mm-services/db.service';
import { SearchService } from '@mm-services/search.service';
import { EditReportComponent } from '@mm-modals/edit-report/edit-report.component';
import { VerifyReportComponent } from '@mm-modals/verify-report/verify-report.component';
import { AuthService } from '@mm-services/auth.service';
import { ServicesActions } from '@mm-actions/services';

describe('Reports effects', () => {
  let effects:ReportsEffects;
  let actions$;
  let reportViewModelGeneratorService;
  let markReadService;
  let modalService;
  let dbService;
  let router;
  let searchService;
  let store;
  let authService;
  let translateService;

  beforeEach(async(() => {
    actions$ = new Observable<Action>();
    const mockedSelectors = [
      { selector: Selectors.getSelectMode, value: false },
      { selector: Selectors.getSelectedReports, value: [] },
      { selector: Selectors.getListReport, value: {} },
      { selector: Selectors.getForms, value: [] },
    ];

    reportViewModelGeneratorService = { get: sinon.stub().resolves() };
    markReadService = { markAsRead: sinon.stub().resolves() };
    modalService = { show: sinon.stub() };
    dbService = { get: sinon.stub(), put: sinon.stub() };
    router = { navigate: sinon.stub() };
    searchService = { search: sinon.stub() };
    authService = { has: sinon.stub() };
    translateService = { instant: sinon.stub().returnsArg(0) };

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
      ],
    });

    effects = TestBed.inject(ReportsEffects);
    store = TestBed.inject(MockStore);
  }));

  afterEach(() => {
    sinon.restore();
  });

  describe('selectReport', () => {
    it('should not be triggered by random actions', async (() => {
      actions$ = of([
        ReportActionList.markReportRead(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.setSelected({}),
      ]);
      effects.selectReport.subscribe();
      expect(reportViewModelGeneratorService.get.callCount).to.equal(0);
    }));

    it('should skip when no provided id', async (() => {
      actions$ = of(ReportActionList.selectReport({  }));
      effects.selectReport.subscribe();
      expect(reportViewModelGeneratorService.get.callCount).to.equal(0);
    }));

    it('should load report when silent', async () => {
      const setLoadingShowContent = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const setSelected = sinon.stub(ReportsActions.prototype, 'setSelected');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      reportViewModelGeneratorService.get.resolves({ _id: 'reportID', model: true });

      actions$ = of(ReportActionList.selectReport({ id: 'reportID', silent: true }));
      await effects.selectReport.toPromise();

      expect(setLoadingShowContent.callCount).to.equal(0);
      expect(reportViewModelGeneratorService.get.callCount).to.equal(1);
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal(['reportID']);
      expect(setSelected.callCount).to.equal(1);
      expect(setSelected.args[0]).to.deep.equal([{ _id: 'reportID', model: true }]);
      expect(unsetSelected.callCount).to.equal(0);
    });

    it('should load report when not silent', async () => {
      actions$ = of(ReportActionList.selectReport({ id: 'myreport', silent: false }));
      const setLoadingShowContent = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const setSelected = sinon.stub(ReportsActions.prototype, 'setSelected');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      reportViewModelGeneratorService.get.resolves({ _id: 'myreport', model: 'yes' });

      await effects.selectReport.toPromise();

      expect(setLoadingShowContent.callCount).to.equal(1);
      expect(setLoadingShowContent.args[0]).to.deep.equal(['myreport']);
      expect(reportViewModelGeneratorService.get.callCount).to.equal(1);
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal(['myreport']);
      expect(setSelected.callCount).to.equal(1);
      expect(setSelected.args[0]).to.deep.equal([{ _id: 'myreport', model: 'yes' }]);
      expect(unsetSelected.callCount).to.equal(0);
    });

    it('should unset selected when error is thrown', async () => {
      actions$ = of(ReportActionList.selectReport({ id: 'report' }));
      const setLoadingShowContent = sinon.stub(GlobalActions.prototype, 'setLoadingShowContent');
      const setSelected = sinon.stub(ReportsActions.prototype, 'setSelected');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      reportViewModelGeneratorService.get.rejects({ some: 'error' });

      await effects.selectReport.toPromise();

      expect(setLoadingShowContent.callCount).to.equal(1);
      expect(setLoadingShowContent.args[0]).to.deep.equal(['report']);
      expect(reportViewModelGeneratorService.get.callCount).to.equal(1);
      expect(reportViewModelGeneratorService.get.args[0]).to.deep.equal(['report']);
      expect(setSelected.callCount).to.equal(0);
      expect(unsetSelected.callCount).to.equal(1);
    });
  });

  describe('setSelected', () => {
    let setSelectedReports;
    let setVerifyingReport;
    let setTitle;
    let markReportRead;
    let setRightActionBar;
    let settingSelected;

    beforeEach(() => {
      setSelectedReports = sinon.stub(ReportsActions.prototype, 'setSelectedReports');
      setVerifyingReport = sinon.stub(ReportsActions.prototype, 'setVerifyingReport');
      setTitle = sinon.stub(ReportsActions.prototype, 'setTitle');
      markReportRead = sinon.stub(ReportsActions.prototype, 'markReportRead');
      setRightActionBar = sinon.stub(ReportsActions.prototype, 'setRightActionBar');
      settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');
    });

    it('should not be triggered by random actions', async (() => {
      actions$ = of([
        ReportActionList.markReportRead(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.selectReport({}),
      ]);
      effects.setSelected.subscribe();

      expect(setRightActionBar.callCount).to.equal(0);
    }));

    it('should call correct actions when not in select mode and not refreshing', () => {
      const model = {
        _id: 'report',
        doc: {
          _id: 'report',
          data: true,
        }
      };
      actions$ = of(ReportActionList.setSelected(model));

      const expandedModel = { ...model, expanded: true };

      effects.setSelected.subscribe();

      expect(setVerifyingReport.callCount).to.equal(1);
      expect(setVerifyingReport.args[0]).to.deep.equal([false]);
      expect(setSelectedReports.callCount).to.equal(1);
      expect(setSelectedReports.args[0]).to.deep.equal([[expandedModel]]);
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal([expandedModel]);
      expect(markReportRead.callCount).to.equal(1);
      expect(markReportRead.args[0]).to.deep.equal(['report']);
      expect(setRightActionBar.callCount).to.equal(1);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([0]);
    });

    it('should call correct actions when not in select mode and refreshing', () => {
      store.overrideSelector(Selectors.getSelectedReports, [{ _id: 'report' }]);
      store.refreshState();
      const model = {
        _id: 'report',
        doc: {
          _id: 'report',
          data: true,
        }
      };
      actions$ = of(ReportActionList.setSelected(model));

      const expandedModel = { ...model, expanded: true };

      effects.setSelected.subscribe();

      expect(setVerifyingReport.callCount).to.equal(0);
      expect(setSelectedReports.callCount).to.equal(1);
      expect(setSelectedReports.args[0]).to.deep.equal([[expandedModel]]);
      expect(setTitle.callCount).to.equal(1);
      expect(setTitle.args[0]).to.deep.equal([expandedModel]);
      expect(markReportRead.callCount).to.equal(1);
      expect(markReportRead.args[0]).to.deep.equal(['report']);
      expect(setRightActionBar.callCount).to.equal(1);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([true]);
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
        ReportActionList.setSelected({}),
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
        ReportActionList.setSelected({}),
      ]);
      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(0);
    });

    it('should mark selected report as read', () => {
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      store.overrideSelector(Selectors.getListReport, { _id: 'report' });
      actions$ = of(ReportActionList.markReportRead('report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(1);
      expect(markReadService.markAsRead.args[0]).to.deep.equal([[{ _id: 'report', read: true }]]);
      expect(updateReportsList.callCount).to.equal(1);
      expect(updateReportsList.args[0]).to.deep.equal([[{ _id: 'report', read: true }]]);
    });

    it('should skip marking as read if already read', () => {
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      store.overrideSelector(Selectors.getListReport, { _id: 'report', read: true });
      actions$ = of(ReportActionList.markReportRead('report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(0);
      expect(updateReportsList.callCount).to.equal(0);
    });

    it('should catch markread service errors', () => {
      markReadService.markAsRead.rejects({ some: 'error' });
      const updateReportsList = sinon.stub(ReportsActions.prototype, 'updateReportsList');
      store.overrideSelector(Selectors.getListReport, { _id: 'my_report' });
      actions$ = of(ReportActionList.markReportRead('my_report'));

      effects.markRead.subscribe();
      expect(markReadService.markAsRead.callCount).to.equal(1);
      expect(markReadService.markAsRead.args[0]).to.deep.equal([[{ _id: 'my_report', read: true }]]);
      expect(updateReportsList.callCount).to.equal(1);
      expect(updateReportsList.args[0]).to.deep.equal([[{ _id: 'my_report', read: true }]]);
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
        ReportActionList.setSelected({}),
      ]);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(0);
    });

    it('should set empty model when in select mode and no selected docs', async(() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReportsDocs, []);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([{}]);
    }));

    it('should set empty model when in select mode and selected docs', async (() => {
      store.overrideSelector(Selectors.getSelectMode, true);
      store.overrideSelector(Selectors.getSelectedReportsDocs, [{ _id: 'doc' }]);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([{}]);
    }));

    it('should set empty model when not in select mode and no selected docs', async (() => {
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportsDocs, []);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([{}]);
    }));

    it('should set correct model when not in select mode and selected doc without contact', async (() => {
      const report = {
        _id: 'report',
        verified: false,
        content_type: 'xml',
      };
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportsDocs, [report]);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      actions$ = of(ReportActionList.setRightActionBar);

      effects.setRightActionBar.subscribe();
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0][0]).to.deep.include({
        verified: false,
        type: 'xml',
      });
    }));

    it('should set correct model when not in select mode and selected doc with false contact', async (() => {
      const report = {
        _id: 'report',
        verified: 'true',
        content_type: 'xml',
        contact: false,
      };
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportsDocs, [report]);
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
      store.overrideSelector(Selectors.getSelectedReportsDocs, [report]);
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
      const report = {
        _id: 'report',
        verified: 'something',
        content_type: 'sms', // not an actual content_type
        contact: { _id: 'non-existing' },
      };
      dbService.get.rejects({ error: 'boom' });
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportsDocs, [report]);
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
    }));

    it('openSendMessageModal function should open correct modal', () => {
      const report = {};
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportsDocs, [report]);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      modalService.show.resolves();

      actions$ = of(ReportActionList.setRightActionBar);
      effects.setRightActionBar.subscribe();

      expect(setRightActionBar.callCount).to.equal(1);
      const openSendMessageModal = setRightActionBar.args[0][0].openSendMessageModal;
      expect(modalService.show.callCount).to.equal(0);
      openSendMessageModal('number');
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        SendMessageComponent,
        { initialState: { fields: { to: 'number' } } },
      ]);
    });

    it('should catch modal show promise rejections', () => {
      const report = {};
      store.overrideSelector(Selectors.getSelectMode, false);
      store.overrideSelector(Selectors.getSelectedReportsDocs, [report]);
      store.overrideSelector(Selectors.getVerifyingReport, false);
      modalService.show.rejects();

      actions$ = of(ReportActionList.setRightActionBar);
      effects.setRightActionBar.subscribe();

      expect(setRightActionBar.callCount).to.equal(1);
      const openSendMessageModal = setRightActionBar.args[0][0].openSendMessageModal;
      expect(modalService.show.callCount).to.equal(0);
      openSendMessageModal('send to');
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        SendMessageComponent,
        { initialState: { fields: { to: 'send to' } } },
      ]);
    });
  });

  describe('setSelectMode', () => {
    let setSelectMode;
    let unsetSelected;

    beforeEach(() => {
      setSelectMode = sinon.stub(GlobalActions.prototype, 'setSelectMode');
      unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
    });

    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.setSelected({}),
      ]);

      effects.setSelectMode.subscribe();
      expect(setSelectMode.callCount).to.equal(0);
      expect(unsetSelected.callCount).to.equal(0);
    });

    it('should set select mode and redirect', () => {
      actions$ = of(ReportActionList.setSelectMode(true));
      effects.setSelectMode.subscribe();

      expect(setSelectMode.callCount).to.equal(1);
      expect(setSelectMode.args[0]).to.deep.equal([true]);
      expect(unsetSelected.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/reports']]);
    });

    it('should unset select mode and redirect', () => {
      actions$ = of(ReportActionList.setSelectMode(false));
      effects.setSelectMode.subscribe();

      expect(setSelectMode.callCount).to.equal(1);
      expect(setSelectMode.args[0]).to.deep.equal([false]);
      expect(unsetSelected.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/reports']]);
    });
  });

  describe('selectAll', () => {
    let setSelectedReports;
    let settingSelected;
    let setRightActionBar;

    beforeEach(() => {
      setSelectedReports = sinon.stub(ReportsActions.prototype, 'setSelectedReports');
      settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');
      setRightActionBar = sinon.stub(ReportsActions.prototype, 'setRightActionBar');
    });

    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.setSelected({}),
      ]);

      effects.selectAll.subscribe();
      expect(searchService.search.callCount).to.equal(0);
    });

    it('should search reports with selected filters and set selected', async(async() => {
      searchService.search.resolves([
        { _id: 'one', form: 'the_form', lineage: [], contact: { _id: 'contact', name: 'person' } },
        { _id: 'two', form: 'form' },
        { _id: 'three', lineage: 'lineage' },
        { _id: 'four', expanded: true, lineage: [{ _id: 'parent' }] },
        { _id: 'five' },
      ]);
      store.overrideSelector(Selectors.getFilters, { form: 'some_form', facility: 'one' });

      actions$ = of(ReportActionList.selectAll);
      effects.selectAll.subscribe();
      await Promise.resolve(); // wait for search service to resolve
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal([
        'reports',
        { form: 'some_form', facility: 'one' },
        { limit: 500, hydrateContactNames: true },
      ]);
      expect(setSelectedReports.callCount).to.equal(1);
      expect(setSelectedReports.args[0]).to.deep.equal([[
        {
          _id: 'one',
          summary:  { _id: 'one', form: 'the_form', lineage: [], contact: { _id: 'contact', name: 'person' } },
          expanded: false,
          lineage: [],
          contact: { _id: 'contact', name: 'person' }
        },
        {
          _id: 'two',
          summary: { _id: 'two', form: 'form' },
          expanded: false,
          lineage: undefined,
          contact: undefined,
        },
        {
          _id: 'three',
          summary: { _id: 'three', lineage: 'lineage' },
          expanded: false,
          lineage: 'lineage',
          contact: undefined,
        },
        {
          _id: 'four',
          summary: { _id: 'four', expanded: true, lineage: [{ _id: 'parent' }] },
          expanded: false,
          lineage: [{ _id: 'parent' }],
          contact: undefined,
        },
        {
          _id: 'five',
          summary: { _id: 'five' },
          expanded: false,
          lineage: undefined,
          contact: undefined,
        },
      ]]);
      expect(settingSelected.callCount).to.equal(1);
      expect(settingSelected.args[0]).to.deep.equal([true]);
      expect(setRightActionBar.callCount).to.equal(1);
      expect(setRightActionBar.args[0]).to.deep.equal([]);
    }));

    it('should catch search errors', async(async() => {
      searchService.search.rejects({ error: 'boom' });
      store.overrideSelector(Selectors.getFilters, { filter: true });

      actions$ = of(ReportActionList.selectAll);
      effects.selectAll.subscribe();
      await Promise.resolve(); // wait for search service to resolve
      expect(searchService.search.callCount).to.equal(1);
      expect(searchService.search.args[0]).to.deep.equal([
        'reports',
        { filter: true },
        { limit: 500, hydrateContactNames: true },
      ]);
      expect(setSelectedReports.callCount).to.equal(0);
      expect(settingSelected.callCount).to.deep.equal(0);
      expect(setRightActionBar.callCount).to.equal(0);
    }));
  });

  describe('launchEditFacilityDialog', () => {
    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.setSelected({}),
      ]);

      effects.setSelectMode.subscribe();
      expect(modalService.show.callCount).to.equal(0);
    });

    it('should pass 1st selected report doc to EditReport modal', () => {
      const selectedReports = [
        { _id: 'report1', doc: { _id: 'report1', contact: { _id: 'contact' } } },
        { _id: 'report2', doc: { _id: 'report2', contact: { _id: 'contact2' } } },
      ];
      modalService.show.resolves();
      store.overrideSelector(Selectors.getSelectedReports, selectedReports);
      store.refreshState();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { initialState: { model: { report: { _id: 'report1', contact: { _id: 'contact' } } } } },
      ]);
    });

    it('should catch modal rejections', async(() => {
      const selectedReports = [
        { _id: 'r', doc: { _id: 'r', contact: { _id: 'ct' } } },
      ];
      modalService.show.rejects();
      store.overrideSelector(Selectors.getSelectedReports, selectedReports);
      store.refreshState();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { initialState: { model: { report: { _id: 'r', contact: { _id: 'ct' } } } } },
      ]);
    }));

    it('should handle undefined selected reports', () => {
      store.overrideSelector(Selectors.getSelectedReports, undefined);
      modalService.show.resolves();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { initialState: { model: { report: undefined } } },
      ]);
    });

    it('should handle empty selected reports', () => {
      store.overrideSelector(Selectors.getSelectedReports, []);
      store.refreshState();
      modalService.show.resolves();
      actions$ = of(ReportActionList.launchEditFacilityDialog);
      effects.launchEditFacilityDialog.subscribe();

      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        EditReportComponent,
        { initialState: { model: { report: undefined } } },
      ]);
    });
  });

  describe('verifyReport', () => {
    beforeEach(() => {
      sinon
        .stub(ReportsActions.prototype, 'setFirstSelectedReportDocProperty')
        .callsFake(props => {
          store
            .select(Selectors.getSelectedReports)
            .pipe(take(1))
            .subscribe(selectedReports => {
              selectedReports[0] = {
                ...selectedReports[0],
                doc: { ...selectedReports[0].doc, ...props },
              };
              store.overrideSelector(Selectors.getSelectedReports, selectedReports);
              store.refreshState();
            });
        });
      sinon.stub(ReportsActions.prototype, 'setFirstSelectedReportFormattedProperty');
      sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');
    });

    it('should not be triggered by random actions', () => {
      actions$ = of([
        ReportActionList.selectReport(''),
        ReportActionList.removeSelectedReport({}),
        ReportActionList.setSelected({}),
      ]);

      effects.verifyReport.subscribe();
      expect(authService.has.callCount).to.equal(0);
    });

    it('should minify report contact before saving and use latest rev', fakeAsync(() => {
      const selectedReports = [{
        _id: 'report',
        doc: {
          _id: 'report',
          _rev: 2,
          contact: { _id: 'contact', name: 'name', parent: { _id: 'parent', type: 'clinic' } },
        },
      }];
      authService.has.resolves(true);
      store.overrideSelector(Selectors.getSelectedReports, selectedReports);
      store.refreshState();

      sinon.stub(Date, 'now').returns(1000); // using faketimers breaks fakeAsync's tick :(
      dbService.put.resolves();
      dbService.get.resolves({ _id: 'report', _rev: 3 });

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

    it('should launch modal with correct params on invalid', fakeAsync(() => {
      const selectedReports = [{
        _id: 'report',
        doc: { _id: 'report' },
      }];
      authService.has.resolves(false);
      store.overrideSelector(Selectors.getSelectedReports, selectedReports);
      store.refreshState();
      modalService.show.rejects(); // user clicks no

      actions$ = of(ReportActionList.verifyReport(false));
      effects.verifyReport.subscribe();

      tick();

      expect(dbService.get.callCount).to.equal(0);
      expect(dbService.put.callCount).to.equal(0);
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        VerifyReportComponent,
        { initialState: { model: { proposedVerificationState: 'reports.verify.invalid' } } }
      ]);
    }));

    it('should launch modal with correct params on valid', fakeAsync(() => {
      const selectedReports = [{ _id: 'report', doc: { _id: 'report' } }];
      authService.has.resolves(false);
      store.overrideSelector(Selectors.getSelectedReports, selectedReports);
      store.refreshState();
      modalService.show.rejects(); // user clicks no

      actions$ = of(ReportActionList.verifyReport(true));
      effects.verifyReport.subscribe();

      tick();

      expect(dbService.get.callCount).to.equal(0);
      expect(dbService.put.callCount).to.equal(0);
      expect(modalService.show.callCount).to.equal(1);
      expect(modalService.show.args[0]).to.deep.equal([
        VerifyReportComponent,
        { initialState: { model: { proposedVerificationState: 'reports.verify.valid' } } }
      ]);
    }));

    it('should catch db put errors', fakeAsync(() => {
      const selectedReports = [{ _id: 'report', doc: { _id: 'report' } }];
      authService.has.resolves(true);
      store.overrideSelector(Selectors.getSelectedReports, selectedReports);
      store.refreshState();

      actions$ = of(ReportActionList.verifyReport(true));
      effects.verifyReport.subscribe();
      dbService.get.resolves({});
      dbService.put.rejects({ some: 'error' });

      tick();

      expect(dbService.get.callCount).to.equal(1);
      expect(dbService.put.callCount).to.equal(1);
    }));

    const scenarios = [
      /* User scenarios with permission to edit */
      { canEdit: true, initial: undefined, setTo: true, expectVerified: true, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: undefined, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: true, setTo: false, expectVerified: false, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: false, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: true, expectVerified: undefined,
        expectPost: true, expectedDate: undefined },
      { canEdit: true, initial: true, setTo: undefined, expectVerified: undefined, expectPost: true, expectedDate: 0 },
      { canEdit: true, initial: false, setTo: undefined, expectVerified: undefined, expectPost: true, expectedDate: 0 },

      /* User scenarios without permission to edit */
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
        const selectedReports = [{
          _id: 'def',
          doc: { _id: 'def', name: 'hello', form: 'P', verified: initial },
        }];

        sinon.stub(Date, 'now').returns(0); // using faketimers breaks fakeAsync's tick :(

        canEdit ? authService.has.resolves(true) : authService.has.resolves(false);
        confirm ? modalService.show.resolves() : modalService.show.rejects();
        dbService.put.resolves();
        dbService.get.resolves({ _rev: '1' });
        store.overrideSelector(Selectors.getSelectedReports, selectedReports);
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
          expect((<any>ReportsActions.prototype.setFirstSelectedReportDocProperty).callCount).to.equal(2);
          expect((<any>ReportsActions.prototype.setFirstSelectedReportDocProperty).args[0]).to.deep.equal([{
            verified: expectVerified,
            verified_date: expectedDate,
          }]);
          expect((<any>ReportsActions.prototype.setFirstSelectedReportDocProperty).args[1])
            .to.deep.equal([{ _rev: '1'}]);
          expect((<any>ServicesActions.prototype.setLastChangedDoc).callCount).to.equal(1);
          expect((<any>ServicesActions.prototype.setLastChangedDoc).args[0]).to.deep.equal([
            { _id: 'def', name: 'hello', form: 'P', verified: initial },
          ]);
        } else {
          expect(dbService.put.called).to.be.false;
          expect((<any>ReportsActions.prototype.setFirstSelectedReportDocProperty).callCount).to.equal(0);
          expect((<any>ServicesActions.prototype.setLastChangedDoc).callCount).to.equal(0);
        }
      }));
    });
  });
});
