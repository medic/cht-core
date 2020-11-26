import { expect } from 'chai';

import { Actions } from '@mm-actions/reports';
import { Actions as globalActions } from '@mm-actions/global';
import { reportsReducer } from '@mm-reducers/reports';

describe('Reports Reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      reports: [],
      reportsById: new Map(),
      selected: [],
      verifyingReport: false,
      filters: {},
    };
  });

  describe('updateReportsList', () => {
    it('should update empty state', () => {
      const reports = [
        { _id: 'r1', reported_date: 200, form: 'form1', other: 'data' },
        { _id: 'r2', reported_date: 100, form: 'form2', other: 'data' },
        { _id: 'r3', reported_date: 80, form: 'form', other: 'data' },
        { _id: 'r4', reported_date: 10, form: 'form3', other: 'data' },
        { _id: 'r5', reported_date: 500, form: 'form2', other: 'data' },
        { _id: 'r6', reported_date: 1000, form: 'form', other: 'data' },
      ];
      const newState = reportsReducer(undefined, Actions.updateReportsList(reports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r6', reported_date: 1000, form: 'form', other: 'data', selected: false },
          { _id: 'r5', reported_date: 500, form: 'form2', other: 'data', selected: false },
          { _id: 'r1', reported_date: 200, form: 'form1', other: 'data', selected: false },
          { _id: 'r2', reported_date: 100, form: 'form2', other: 'data', selected: false },
          { _id: 'r3', reported_date: 80, form: 'form', other: 'data', selected: false },
          { _id: 'r4', reported_date: 10, form: 'form3', other: 'data', selected: false },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 200, form: 'form1', other: 'data', selected: false }],
          ['r2', { _id: 'r2', reported_date: 100, form: 'form2', other: 'data', selected: false }],
          ['r3', { _id: 'r3', reported_date: 80, form: 'form', other: 'data', selected: false }],
          ['r4', { _id: 'r4', reported_date: 10, form: 'form3', other: 'data', selected: false }],
          ['r5', { _id: 'r5', reported_date: 500, form: 'form2', other: 'data', selected: false }],
          ['r6', { _id: 'r6', reported_date: 1000, form: 'form', other: 'data', selected: false }],
        ]),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should add new reports', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: false },
          { _id: 'r3', reported_date: 200, form: 'form1', selected: false },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: false }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1', selected: false }],
        ]),
      };

      const newReports = [
        { _id: 'r4', reported_date: 2000 },
        { _id: 'r5', reported_date: 100 },
        { _id: 'r6', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.updateReportsList(newReports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r4', reported_date: 2000, selected: false },
          { _id: 'r1', reported_date: 1000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: false },
          { _id: 'r6', reported_date: 300, selected: false },
          { _id: 'r3', reported_date: 200, form: 'form1', selected: false },
          { _id: 'r5', reported_date: 100, selected: false },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: false }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1', selected: false }],
          ['r4', { _id: 'r4', reported_date: 2000, selected: false }],
          ['r5', { _id: 'r5', reported_date: 100, selected: false }],
          ['r6', { _id: 'r6', reported_date: 300, selected: false }],
        ]),
      });
    });

    it('should set selected property on new reports', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: true },
          { _id: 'r3', reported_date: 200, form: 'form1', selected: false },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: true }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1', selected: false }],
        ]),
        selected: [
          { _id: 'r5', reported_date: 100 },
          { _id: 'r2', reported_date: 500, form: 'form2' },
        ],
      };

      const newReports = [
        { _id: 'r4', reported_date: 2000 },
        { _id: 'r5', reported_date: 100 },
        { _id: 'r6', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.updateReportsList(newReports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r4', reported_date: 2000, selected: false },
          { _id: 'r1', reported_date: 1000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: true },
          { _id: 'r6', reported_date: 300, selected: false },
          { _id: 'r3', reported_date: 200, form: 'form1', selected: false },
          { _id: 'r5', reported_date: 100, selected: true },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: true }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1', selected: false }],
          ['r4', { _id: 'r4', reported_date: 2000, selected: false }],
          ['r5', { _id: 'r5', reported_date: 100, selected: true }],
          ['r6', { _id: 'r6', reported_date: 300, selected: false }],
        ]),
        selected: [
          { _id: 'r5', reported_date: 100 },
          { _id: 'r2', reported_date: 500, form: 'form2' },
        ],
      });
    });

    it('should update existent reports', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: false },
          { _id: 'r3', reported_date: 200, form: 'form1', selected: false },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: false }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1', selected: false }],
        ]),
      };

      const updatedReports = [
        { _id: 'r1', reported_date: 2000, form: 'form' },
        { _id: 'r3', reported_date: 200, form: 'otherform' },
        { _id: 'r5', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.updateReportsList(updatedReports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r1', reported_date: 2000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: false },
          { _id: 'r5', reported_date: 300, selected: false },
          { _id: 'r3', reported_date: 200, form: 'otherform', selected: false },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 2000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: false }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'otherform', selected: false }],
          ['r5', { _id: 'r5', reported_date: 300, selected: false }],
        ]),
      });
    });

    it('should set selected property on existent reports', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: true },
          { _id: 'r3', reported_date: 200, form: 'form1', selected: true },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: true }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1', selected: true }],
        ]),
        selected: [
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
          { _id: 'r5', reported_date: 300 },
        ],
      };

      const updatedReports = [
        { _id: 'r1', reported_date: 2000, form: 'form' },
        { _id: 'r3', reported_date: 200, form: 'otherform' },
        { _id: 'r5', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.updateReportsList(updatedReports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r1', reported_date: 2000, form: 'form', selected: false },
          { _id: 'r2', reported_date: 500, form: 'form2', selected: true },
          { _id: 'r5', reported_date: 300, selected: true },
          { _id: 'r3', reported_date: 200, form: 'otherform', selected: true },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 2000, form: 'form', selected: false }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2', selected: true }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'otherform', selected: true }],
          ['r5', { _id: 'r5', reported_date: 300, selected: true }],
        ]),
        selected: [
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
          { _id: 'r5', reported_date: 300 },
        ],
      });
    });
  });

  describe('removeReportFromList', () => {
    it('should remove report from the list', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form' },
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form' }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1' }],
        ]),
      };

      const report = { _id: 'r2' };
      const newState = reportsReducer(state, Actions.removeReportFromList(report));
      expect(newState).to.deep.equal({
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1' }],
        ]),
      });
    });

    it('should work when report is not in the list', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form' },
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form' }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1' }],
        ]),
      };

      const report = { _id: 'r12' };
      const newState = reportsReducer(state, Actions.removeReportFromList(report));
      expect(newState).to.deep.equal({
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form' },
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form' }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1' }],
        ]),
      });
    });

    it('should work when no state', () => {
      const report = { _id: 'r12' };
      const newState = reportsReducer(undefined, Actions.removeReportFromList(report));
      expect(newState).to.deep.equal(state);
    });
  });

  describe('resetReportsList', () => {
    it('should reset list properties', () => {
      state = {
        reports: [
          { _id: 'r1', reported_date: 1000, form: 'form' },
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r3', reported_date: 200, form: 'form1' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form' }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1' }],
        ]),
        selected: [],
        verifyingReport: false,
        filters: {},
      };

      const newState = reportsReducer(state, Actions.resetReportsList());
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });
  });

  describe('addSelectedReport', () => {
    it('should add selected report to empty list', () => {
      const selected = { _id: 'selected_report', some: 'data' };
      const newState = reportsReducer(state, Actions.addSelectedReport(selected));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [{ _id: 'selected_report', some: 'data' }],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should add selected report to existent list', () => {
      state = {
        reports: [
          { _id: 'one', report: true, selected: true },
          { _id: 'two', report: true, form: 'a', selected: true },
          { _id: 'three', report: true, form: 'a', selected: false },
          { _id: 'four', report: true, form: 'a', selected: false },
        ],
        reportsById: new Map([
          ['one', { _id: 'one', report: true, selected: true }],
          ['two', { _id: 'two', report: true, form: 'a', selected: true }],
          ['three', { _id: 'three', report: true, form: 'a', selected: false }],
          ['four', { _id: 'four', report: true, form: 'a', selected: false }],
        ]),
        selected: [
          { _id: 'one', report: true },
          { _id: 'two', report: true, form: 'a' }
        ],
      };

      const selected =  { _id: 'four', report: true, form: 'a' };
      const newState = reportsReducer(state, Actions.addSelectedReport(selected));
      expect(newState).to.deep.equal({
        reports: [
          { _id: 'one', report: true, selected: true },
          { _id: 'two', report: true, form: 'a', selected: true },
          { _id: 'three', report: true, form: 'a', selected: false },
          { _id: 'four', report: true, form: 'a', selected: true },
        ],
        reportsById: new Map([
          ['one', { _id: 'one', report: true, selected: true }],
          ['two', { _id: 'two', report: true, form: 'a', selected: true }],
          ['three', { _id: 'three', report: true, form: 'a', selected: false }],
          ['four', { _id: 'four', report: true, form: 'a', selected: true }],
        ]),
        selected: [
          { _id: 'one', report: true },
          { _id: 'two', report: true, form: 'a' },
          { _id: 'four', report: true, form: 'a' },
        ],
      });
    });
  });

  describe('removeSelectedReport', () => {
    it('should work on empty list', () => {
      const report = { _id: 'selected_report' };
      const newState = reportsReducer(undefined, Actions.removeSelectedReport(report));
      expect(newState).to.deep.equal(state);
    });

    it('should work when report is not selected', () => {
      const report = { _id: 'selected_report' };
      state.selected = [
        { _id: 'report1' },
        { _id: 'report2', some: 'data' },
        { _id: 'report3', reported_date: 200 },
      ];
      const newState = reportsReducer(state, Actions.removeSelectedReport(report));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'report1' },
          { _id: 'report2', some: 'data' },
          { _id: 'report3', reported_date: 200 },
        ],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should work when report is selected', () => {
      const selected = { _id: 'selected_report' };
      state.selected = [
        { _id: 'report1' },
        { _id: 'report2', some: 'data' },
        { _id: 'selected_report', reported_date: 1000, some: 'value' },
        { _id: 'report3', reported_date: 200 },
      ];
      const newState = reportsReducer(state, Actions.removeSelectedReport(selected));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'report1' },
          { _id: 'report2', some: 'data' },
          { _id: 'report3', reported_date: 200 },
        ],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should work when report is selected with ID', () => {
      state.selected = [
        { _id: 'report1' },
        { _id: 'report2', some: 'data' },
        { _id: 'selected_report', reported_date: 1000, some: 'value' },
        { _id: 'report3', reported_date: 200 },
      ];
      const newState = reportsReducer(state, Actions.removeSelectedReport('selected_report'));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'report1' },
          { _id: 'report2', some: 'data' },
          { _id: 'report3', reported_date: 200 },
        ],
        verifyingReport: false,
        filters: {},
      });
    });
  });

  describe('setSelectedReports', () => {
    it('should set selected reports when list is empty', () => {
      const selected = [
        { _id: 'one', reported_date: 100 },
        { _id: 'two', reported_date: 200 },
        { _id: 'three', reported_date: 300 },
      ];

      const newState = reportsReducer(undefined, Actions.setSelectedReports(selected));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'one', reported_date: 100 },
          { _id: 'two', reported_date: 200 },
          { _id: 'three', reported_date: 300 },
        ],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should set selected reports when not empty list', () => {
      state.selected = [
        { _id: 'selected1' },
        { _id: 'two', reported_date: 200 },
        { _id: 'selected3' },
      ];

      const selected = [
        { _id: 'one', reported_date: 100 },
        { _id: 'two', reported_date: 200 },
        { _id: 'three', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.setSelectedReports(selected));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'one', reported_date: 100 },
          { _id: 'two', reported_date: 200 },
          { _id: 'three', reported_date: 300 },
        ],
        verifyingReport: false,
        filters: {},
      });
    });
  });

  describe('clearSelected', () => {
    it('should work on empty list', () => {
      const newState = reportsReducer(undefined, globalActions.clearSelected());
      expect(newState).to.deep.equal(state);
    });

    it('should work on existent list', () => {
      state.selected = [
        { _id: 'selected1' },
        { _id: 'two', reported_date: 200 },
        { _id: 'selected3' },
      ];
      const newState = reportsReducer(state, globalActions.clearSelected());
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });
  });

  describe('updateSelectedReportItem', () => {
    it('should work when no selected', () => {
      state.selected = undefined;
      const newState = reportsReducer(state, Actions.updateSelectedReportItem({ id: 'aaaa' }));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: undefined,
        verifyingReport: false,
        filters: {},
      });
    });

    it('should work when item not found', () => {
      state.selected = [
        { _id: 'sel1', doc: { _id: 'sel1', field: 1 } },
        { _id: 'sel2', doc: { _id: 'sel2', field: 2 } },
        { _id: 'sel3', doc: { _id: 'sel3', field: 3 } },
      ];
      const newState = reportsReducer(state, Actions.updateSelectedReportItem({ id: 'aaaa' }));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        verifyingReport: false,
        filters: {},
        selected: [
          { _id: 'sel1', doc: { _id: 'sel1', field: 1 } },
          { _id: 'sel2', doc: { _id: 'sel2', field: 2 } },
          { _id: 'sel3', doc: { _id: 'sel3', field: 3 } },
        ],
      });
    });

    it('should update selected report when found', () => {
      const payload = {
        id: 'report_3',
        selected: {
          loading: true,
          expanded: true,
        },
      };
      state.selected = [
        { _id: 'report_1', doc: { _id: 'report_1', field: 1 } },
        { _id: 'report_3', loading: false, doc: { _id: 'report_3', field: 1 } },
        { _id: 'report_5', doc: { _id: 'report_4', field: 1 } },
      ];
      const newState = reportsReducer(state, Actions.updateSelectedReportItem(payload));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        verifyingReport: false,
        filters: {},
        selected: [
          { _id: 'report_1', doc: { _id: 'report_1', field: 1 } },
          { _id: 'report_3', loading: true, expanded: true, doc: { _id: 'report_3', field: 1 } },
          { _id: 'report_5', doc: { _id: 'report_4', field: 1 } },
        ],
      });
    });
  });

  describe('setVerifyingReport', () => {
    it('should update verifying report', () => {
      state = reportsReducer(state, Actions.setVerifyingReport(true));
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: true,
        filters: {},
      });
      state  = reportsReducer(state, Actions.setVerifyingReport(false));
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });
  });

  describe('toggleVerifyingReport', () => {
    it('should toggle verifying report', () => {
      state = reportsReducer(state, Actions.toggleVerifyingReport());
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: true,
        filters: {},
      });
      state = reportsReducer(state, Actions.toggleVerifyingReport());
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
      state = reportsReducer(state, Actions.toggleVerifyingReport());
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: true,
        filters: {},
      });
    });
  });

  describe('setFirstSelectedReportDocProperty', () => {
    it('should work with empty state', () => {
      state = reportsReducer(state, Actions.setFirstSelectedReportDocProperty({ prop: true }));
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should update the 1st selected doc', () => {
      state.selected = [
        { _id: 'doc', doc: { _id: 'doc', field: 1, _rev: 1 }, formatted: { a: 1 } },
        { _id: 'doc2', doc: { _id: 'doc2', field: 2, _rev: 1 }, formatted: { a: 2 } },
        { _id: 'doc3', doc: { _id: 'doc3', field: 3, _rev: 1 }, formatted: { a: 3 } },
      ];
      const newState = reportsReducer(state, Actions.setFirstSelectedReportDocProperty({ field: 3, other: 1 }));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'doc', doc: { _id: 'doc', field: 3, _rev: 1, other: 1 }, formatted: { a: 1 } },
          { _id: 'doc2', doc: { _id: 'doc2', field: 2, _rev: 1 }, formatted: { a: 2 } },
          { _id: 'doc3', doc: { _id: 'doc3', field: 3, _rev: 1 }, formatted: { a: 3 } },
        ],
        verifyingReport: false,
        filters: {},
      });
    });
  });

  describe('setFirstSelectedReportFormattedProperty', () => {
    it('should work with empty state', () => {
      state = reportsReducer(state, Actions.setFirstSelectedReportFormattedProperty({ prop: true }));
      expect(state).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should update the 1st selected doc', () => {
      state.selected = [
        { _id: 'doc', doc: { _id: 'doc', field: 1, _rev: 1 }, formatted: { a: 1, b: 2 } },
        { _id: 'doc2', doc: { _id: 'doc2', field: 2, _rev: 1 }, formatted: { a: 2, b: 3 } },
        { _id: 'doc3', doc: { _id: 'doc3', field: 3, _rev: 1 }, formatted: { a: 3, b: 4 } },
      ];
      const newState = reportsReducer(state, Actions.setFirstSelectedReportFormattedProperty({ b: 22, c: 44 }));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'doc', doc: { _id: 'doc', field: 1, _rev: 1 }, formatted: { a: 1, b: 22, c: 44 } },
          { _id: 'doc2', doc: { _id: 'doc2', field: 2, _rev: 1 }, formatted: { a: 2, b: 3 } },
          { _id: 'doc3', doc: { _id: 'doc3', field: 3, _rev: 1 }, formatted: { a: 3, b: 4 } },
        ],
        verifyingReport: false,
        filters: {},
      });
    });
  });
});
