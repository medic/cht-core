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
          { _id: 'r6', reported_date: 1000, form: 'form', other: 'data' },
          { _id: 'r5', reported_date: 500, form: 'form2', other: 'data' },
          { _id: 'r1', reported_date: 200, form: 'form1', other: 'data' },
          { _id: 'r2', reported_date: 100, form: 'form2', other: 'data' },
          { _id: 'r3', reported_date: 80, form: 'form', other: 'data' },
          { _id: 'r4', reported_date: 10, form: 'form3', other: 'data' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 200, form: 'form1', other: 'data' }],
          ['r2', { _id: 'r2', reported_date: 100, form: 'form2', other: 'data' }],
          ['r3', { _id: 'r3', reported_date: 80, form: 'form', other: 'data' }],
          ['r4', { _id: 'r4', reported_date: 10, form: 'form3', other: 'data' }],
          ['r5', { _id: 'r5', reported_date: 500, form: 'form2', other: 'data' }],
          ['r6', { _id: 'r6', reported_date: 1000, form: 'form', other: 'data' }],
        ]),
        selected: [],
        verifyingReport: false,
        filters: {},
      });
    });

    it('should add new reports', () => {
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

      const newReports = [
        { _id: 'r4', reported_date: 2000 },
        { _id: 'r5', reported_date: 100 },
        { _id: 'r6', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.updateReportsList(newReports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r4', reported_date: 2000 },
          { _id: 'r1', reported_date: 1000, form: 'form' },
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r6', reported_date: 300 },
          { _id: 'r3', reported_date: 200, form: 'form1' },
          { _id: 'r5', reported_date: 100 },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 1000, form: 'form' }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'form1' }],
          ['r4', { _id: 'r4', reported_date: 2000 }],
          ['r5', { _id: 'r5', reported_date: 100 }],
          ['r6', { _id: 'r6', reported_date: 300 }],
        ]),
      });
    });

    it('should update existent reports', () => {
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

      const updatedReports = [
        { _id: 'r1', reported_date: 2000, form: 'form' },
        { _id: 'r3', reported_date: 200, form: 'otherform' },
        { _id: 'r5', reported_date: 300 },
      ];

      const newState = reportsReducer(state, Actions.updateReportsList(updatedReports));
      expect(newState).to.deep.equal({
        reports: [
          // sorted by reported_date
          { _id: 'r1', reported_date: 2000, form: 'form' },
          { _id: 'r2', reported_date: 500, form: 'form2' },
          { _id: 'r5', reported_date: 300 },
          { _id: 'r3', reported_date: 200, form: 'otherform' },
        ],
        reportsById: new Map([
          ['r1', { _id: 'r1', reported_date: 2000, form: 'form' }],
          ['r2', { _id: 'r2', reported_date: 500, form: 'form2' }],
          ['r3', { _id: 'r3', reported_date: 200, form: 'otherform' }],
          ['r5', { _id: 'r5', reported_date: 300 }],
        ]),
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
      state.selected = [{ _id: 'one', report: true }, { _id: 'two', report: true, form: 'a' }];
      const selected = { _id: 'selected_report', some: 'data' };
      const newState = reportsReducer(state, Actions.addSelectedReport(selected));
      expect(newState).to.deep.equal({
        reports: [],
        reportsById: new Map(),
        selected: [
          { _id: 'one', report: true },
          { _id: 'two', report: true, form: 'a' },
          { _id: 'selected_report', some: 'data' },
        ],
        verifyingReport: false,
        filters: {},
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
});
