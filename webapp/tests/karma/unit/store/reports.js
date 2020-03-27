describe('Reports store', () => {
  'use strict';

  let reportsActions;
  let getState;
  let selectors;

  beforeEach(module('inboxApp'));

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    inject(($ngRedux, ReportsActions, Selectors) => {
      reportsActions = ReportsActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  };

  const createReportsState = state => ({ reports: state });

  it('sets selected reports', () => {
    const initialState = createReportsState({ selected: null });
    setupStore(initialState);
    const selected = {};
    reportsActions.setSelectedReports(selected);
    const state = getState();
    const reportsState = selectors.getReportsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(reportsState).to.deep.equal({ selected });
  });

  it('updates selected report item', () => {
    const id = '1';
    const initialState = createReportsState({ selected: [{ _id: id, expanded: false }] });
    setupStore(initialState);
    const selected = { expanded: true };
    reportsActions.updateSelectedReportItem(id, selected);
    const state = getState();
    const reportsState = selectors.getReportsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(reportsState.selected).to.not.equal(selectors.getReportsState(initialState).selected);
    chai.expect(reportsState).to.deep.equal({ selected: [{ _id: id, expanded: true }] });
  });

  it('sets relevant doc property for the first selected report item in an array', () => {
    const oldContact = { some: true, other: true, properties: true };
    const initialState = createReportsState({ selected: [{ doc: { contact: oldContact }}] });
    setupStore(initialState);
    const newContact = { test: true };
    reportsActions.setFirstSelectedReportDocProperty({ contact: newContact });
    const state = getState();
    const reportsState = selectors.getReportsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(reportsState.selected).to.not.equal(selectors.getReportsState(initialState).selected);
    chai.expect(reportsState).to.deep.equal({ selected: [{ doc: { contact: newContact }}] });
  });

  it('sets relevant formatted property for the first selected report item in an array', () => {
    const initialState = createReportsState({ selected: [{ formatted: { verified: true }}] });
    setupStore(initialState);
    const formatted = { verified: undefined };
    reportsActions.setFirstSelectedReportFormattedProperty(formatted);
    const state = getState();
    const reportsState = selectors.getReportsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(reportsState.selected).to.not.equal(selectors.getReportsState(initialState).selected);
    chai.expect(reportsState).to.deep.equal({ selected: [{ formatted }] });
  });

  it('adds a selected report item', () => {
    const item1 = { id: '1' };
    const item2 = { id: '2' };
    const initialState = createReportsState({ selected: [item1] });
    setupStore(initialState);

    reportsActions.addSelectedReport(item2);

    const state = getState();
    const reportsState = selectors.getReportsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(reportsState.selected).to.not.equal(selectors.getReportsState(initialState).selected);
    chai.expect(reportsState).to.deep.equal({ selected: [item1, item2] });
  });

  it('removes a selected report item', () => {
    const item1 = { _id: '1' };
    const item2 = { _id: '2' };
    const initialState = createReportsState({ selected: [item1, item2] });
    setupStore(initialState);

    reportsActions.removeSelectedReport('1');

    const state = getState();
    const reportsState = selectors.getReportsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(reportsState.selected).to.not.equal(selectors.getReportsState(initialState).selected);
    chai.expect(reportsState).to.deep.equal({ selected: [item2] });
  });
});
