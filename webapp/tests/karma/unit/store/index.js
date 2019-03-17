describe('Store', function() {
  'use strict';

  let actions,
      getState,
      loadChildren = sinon.stub(),
      loadReports = sinon.stub();

  beforeEach(module('inboxApp'));

  function setupStore(initialState) {
    KarmaUtils.setupMockStore(initialState);
    module(function ($provide) {
      'ngInject';
      $provide.value('ContactViewModelGenerator', { loadChildren, loadReports });
    });
    inject(function($ngRedux, Actions) {
      actions = Actions($ngRedux.dispatch);
      getState = $ngRedux.getState;
    });
  }

  it('clears cancelCallback', () => {
    const initialState = { cancelCallback: 'test' };
    setupStore(initialState);
    actions.clearCancelCallback();
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state).to.deep.equal({ cancelCallback: null });
  });

  it('sets cancelCallback', () => {
    const initialState = { cancelCallback: null };
    setupStore(initialState);
    const cancelCallback = 'test';
    actions.setCancelCallback(cancelCallback);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state).to.deep.equal({ cancelCallback });
  });

  it('sets enketoError', () => {
    const initialState = {
      enketoStatus: { error: null }
    };
    setupStore(initialState);
    const error = 'test';
    actions.setEnketoError(error);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.enketoStatus).to.not.equal(initialState.enketoStatus);
    chai.expect(state).to.deep.equal({ enketoStatus: { error } });
  });

  it('sets enketoEditedStatus', () => {
    const initialState = {
      enketoStatus: { edited: false }
    };
    setupStore(initialState);
    actions.setEnketoEditedStatus(true);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.enketoStatus).to.not.equal(initialState.enketoStatus);
    chai.expect(state).to.deep.equal({ enketoStatus: { edited: true } });
  });

  it('sets enketoSavingStatus', () => {
    const initialState = {
      enketoStatus: { saving: false }
    };
    setupStore(initialState);
    actions.setEnketoSavingStatus(true);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.enketoStatus).to.not.equal(initialState.enketoStatus);
    chai.expect(state).to.deep.equal({ enketoStatus: { saving: true } });
  });

  it('sets selectMode', () => {
    const initialState = { selectMode: false };
    setupStore(initialState);
    actions.setSelectMode(true);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state).to.deep.equal({ selectMode: true });
  });

  it('sets selected', () => {
    const initialState = { selected: null };
    setupStore(initialState);
    const selected = {};
    actions.setSelected(selected);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state).to.deep.equal({ selected });
  });

  it('updates selected', () => {
    const initialState = { selected: { doc: '1' } };
    setupStore(initialState);
    const selected = { doc: '2' };
    actions.updateSelected(selected);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state).to.deep.equal({ selected });
  });

  it('updates selected item', () => {
    const id = '1';
    const initialState = { selected: [{ _id: id, expanded: false }] };
    setupStore(initialState);
    const selected = { expanded: true };
    actions.updateSelectedItem(id, selected);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state).to.deep.equal({ selected: [{ _id: id, expanded: true }] });
  });

  it('sets relevant doc property for the first selected item in an array', () => {
    const oldContact = { some: true, other: true, properties: true };
    const initialState = { selected: [{ doc: { contact: oldContact }}] };
    setupStore(initialState);
    const newContact = { test: true };
    actions.setFirstSelectedDocProperty({ contact: newContact });
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state).to.deep.equal({ selected: [{ doc: { contact: newContact }}] });
  });

  it('sets relevant formatted property for the first selected item in an array', () => {
    const initialState = { selected: [{ formatted: { verified: true }}] };
    setupStore(initialState);
    const formatted = { verified: undefined };
    actions.setFirstSelectedFormattedProperty(formatted);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state).to.deep.equal({ selected: [{ formatted }] });
  });

  it('sets loadingSelectedChildren', () => {
    const initialState = { loadingSelectedChildren: false };
    setupStore(initialState);
    actions.setLoadingSelectedChildren(true);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state).to.deep.equal({ loadingSelectedChildren: true });
  });

  it('sets loadingSelectedReports', () => {
    const initialState = { loadingSelectedReports: false };
    setupStore(initialState);
    actions.setLoadingSelectedReports(true);
    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state).to.deep.equal({ loadingSelectedReports: true });
  });

  it('loads selected children', (done) => {
    const selected = { _id: '1' };
    const initialState = { selected };
    setupStore(initialState);

    const children = ['child'];
    loadChildren.withArgs(selected).returns(Promise.resolve(children));
    actions.loadSelectedChildren();

    setTimeout(() => {
      const state = getState();
      chai.expect(state).to.not.equal(initialState);
      chai.expect(state.selected).to.not.equal(initialState.selected);
      chai.expect(state).to.deep.equal({ selected: { _id: '1', children }, loadingSelectedChildren: false });
      done();
    });
  });

  it('loads selected reports', (done) => {
    const selected = { _id: '1' };
    const initialState = { selected };
    setupStore(initialState);

    const reports = ['report'];
    loadReports.withArgs(selected).returns(Promise.resolve(reports));
    actions.loadSelectedReports();


    setTimeout(() => {
      const state = getState();
      chai.expect(state).to.not.equal(initialState);
      chai.expect(state.selected).to.not.equal(initialState.selected);
      chai.expect(state).to.deep.equal({ selected: { _id: '1', reports }, loadingSelectedReports: false });
      done();
    });
  });

  it('adds a message to selected', () => {
    const message1 = { id: '1' };
    const message2 = { id: '2' };
    const initialState = { selected: { messages: [message1] } };
    setupStore(initialState);

    actions.addSelectedMessage(message2);

    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state.selected.messages).to.not.equal(initialState.selected.messages);
    chai.expect(state).to.deep.equal({ selected: { messages: [message1, message2]} });
  });

  it('removes a message from selected', () => {
    const message1 = { id: '1' };
    const message2 = { id: '2' };
    const initialState = { selected: { messages: [message1, message2] } };
    setupStore(initialState);

    actions.removeSelectedMessage('1');

    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state.selected.messages).to.not.equal(initialState.selected.messages);
    chai.expect(state).to.deep.equal({ selected: { messages: [message2]} });
  });

  it('adds a selected item', () => {
    const item1 = { id: '1' };
    const item2 = { id: '2' };
    const initialState = { selected: [item1] };
    setupStore(initialState);

    actions.addSelected(item2);

    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state).to.deep.equal({ selected: [item1, item2] });
  });

  it('removes a selected item', () => {
    const item1 = { _id: '1' };
    const item2 = { _id: '2' };
    const initialState = { selected: [item1, item2] };
    setupStore(initialState);

    actions.removeSelected('1');

    const state = getState();
    chai.expect(state).to.not.equal(initialState);
    chai.expect(state.selected).to.not.equal(initialState.selected);
    chai.expect(state).to.deep.equal({ selected: [item2] });
  });
});
