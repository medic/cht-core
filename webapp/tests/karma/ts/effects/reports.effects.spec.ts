import { provideMockActions } from '@ngrx/effects/testing';
import { async, fakeAsync, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { Action } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { Actions as ReportActionList, ReportsActions } from '@mm-actions/reports';
import { GlobalActions } from '@mm-actions/global';
import { ReportViewModelGeneratorService } from '@mm-services/report-view-model-generator.service';
import { Selectors } from '@mm-selectors/index';
import { MarkReadService } from '@mm-services/mark-read.service';
import { ReportsEffects } from '@mm-effects/reports.effects';

describe('Reports effects', () => {
  let effects:ReportsEffects;
  let actions$;
  let reportViewModelGeneratorService;
  let markReadService;
  let store;

  beforeEach(async(() => {
    actions$ = new Observable<Action>();
    let mockedSelectors = [
      { selector: Selectors.getSelectMode, value: false },
      { selector: Selectors.getSelectedReports, value: [] },
      { selector: Selectors.getListReport, value: {} },
      { selector: Selectors.getForms, value: [] },
    ];

    TestBed.configureTestingModule({
      imports: [
        EffectsModule.forRoot([ReportsEffects]),
      ],
      providers: [
        provideMockActions(() => actions$),
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ReportViewModelGeneratorService, useValue: { get: sinon.stub().resolves() } },
        { provide: MarkReadService, useValue: { markAsRead: sinon.stub().resolves() } },
      ],
    });

    effects = TestBed.inject(ReportsEffects);
    store = TestBed.inject(MockStore);
    reportViewModelGeneratorService = TestBed.inject(ReportViewModelGeneratorService);
    markReadService = TestBed.inject(MarkReadService);
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
});

