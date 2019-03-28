describe('Store', function() {
  'use strict';

  let globalActions,
      getState,
      loadChildren = sinon.stub(),
      loadReports = sinon.stub(),
      selectors;

  beforeEach(module('inboxApp'));

  function setupStore(initialState) {
    KarmaUtils.setupMockStore(initialState);
    module(function ($provide) {
      'ngInject';
      $provide.value('ContactViewModelGenerator', { loadChildren, loadReports });
    });
    inject(function($ngRedux, GlobalActions, Selectors) {
      globalActions = GlobalActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  }

  function createGlobalState(state) {
    return { global: state };
  }

  describe('Global', () => {
    it('clears cancelCallback', () => {
      const initialState = createGlobalState({ cancelCallback: 'test' });
      setupStore(initialState);
      globalActions.clearCancelCallback();
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ cancelCallback: null });
    });

    it('sets cancelCallback', () => {
      const initialState = createGlobalState({ cancelCallback: null });
      setupStore(initialState);
      const cancelCallback = 'test';
      globalActions.setCancelCallback(cancelCallback);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ cancelCallback });
    });

    it('sets enketoError', () => {
      const initialState = createGlobalState({
        enketoStatus: { error: null }
      });
      setupStore(initialState);
      const error = 'test';
      globalActions.setEnketoError(error);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.enketoStatus).to.not.equal(initialState.enketoStatus);
      chai.expect(globalState).to.deep.equal({ enketoStatus: { error } });
    });

    it('sets enketoEditedStatus', () => {
      const initialState = createGlobalState({
        enketoStatus: { edited: false }
      });
      setupStore(initialState);
      globalActions.setEnketoEditedStatus(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.enketoStatus).to.not.equal(initialState.enketoStatus);
      chai.expect(globalState).to.deep.equal({ enketoStatus: { edited: true } });
    });

    it('sets enketoSavingStatus', () => {
      const initialState = createGlobalState({
        enketoStatus: { saving: false }
      });
      setupStore(initialState);
      globalActions.setEnketoSavingStatus(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.enketoStatus).to.not.equal(initialState.enketoStatus);
      chai.expect(globalState).to.deep.equal({ enketoStatus: { saving: true } });
    });

    it('sets selectMode', () => {
      const initialState = createGlobalState({ selectMode: false });
      setupStore(initialState);
      globalActions.setSelectMode(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ selectMode: true });
    });

    it('sets selected', () => {
      const initialState = createGlobalState({ selected: null });
      setupStore(initialState);
      const selected = {};
      globalActions.setSelected(selected);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ selected });
    });

    it('updates selected', () => {
      const initialState = createGlobalState({ selected: { doc: '1' } });
      setupStore(initialState);
      const selected = { doc: '2' };
      globalActions.updateSelected(selected);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState).to.deep.equal({ selected });
    });

    it('updates selected item', () => {
      const id = '1';
      const initialState = createGlobalState({ selected: [{ _id: id, expanded: false }] });
      setupStore(initialState);
      const selected = { expanded: true };
      globalActions.updateSelectedItem(id, selected);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState).to.deep.equal({ selected: [{ _id: id, expanded: true }] });
    });

    it('sets relevant doc property for the first selected item in an array', () => {
      const oldContact = { some: true, other: true, properties: true };
      const initialState = createGlobalState({ selected: [{ doc: { contact: oldContact }}] });
      setupStore(initialState);
      const newContact = { test: true };
      globalActions.setFirstSelectedDocProperty({ contact: newContact });
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState).to.deep.equal({ selected: [{ doc: { contact: newContact }}] });
    });

    it('sets relevant formatted property for the first selected item in an array', () => {
      const initialState = createGlobalState({ selected: [{ formatted: { verified: true }}] });
      setupStore(initialState);
      const formatted = { verified: undefined };
      globalActions.setFirstSelectedFormattedProperty(formatted);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState).to.deep.equal({ selected: [{ formatted }] });
    });

    it('sets loadingSelectedChildren', () => {
      const initialState = createGlobalState({ loadingSelectedChildren: false });
      setupStore(initialState);
      globalActions.setLoadingSelectedChildren(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ loadingSelectedChildren: true });
    });

    it('sets loadingSelectedReports', () => {
      const initialState = createGlobalState({ loadingSelectedReports: false });
      setupStore(initialState);
      globalActions.setLoadingSelectedReports(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ loadingSelectedReports: true });
    });

    it('loads selected children', (done) => {
      const selected = { _id: '1' };
      const initialState = createGlobalState({ selected });
      setupStore(initialState);

      const children = ['child'];
      loadChildren.withArgs(selected).returns(Promise.resolve(children));
      globalActions.loadSelectedChildren();

      setTimeout(() => {
        const state = getState();
      const globalState = selectors.getGlobalState(state);
        chai.expect(state).to.not.equal(initialState);
        chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
        chai.expect(globalState).to.deep.equal({ selected: { _id: '1', children }, loadingSelectedChildren: false });
        done();
      });
    });

    it('loads selected reports', (done) => {
      const selected = { _id: '1' };
      const initialState = createGlobalState({ selected });
      setupStore(initialState);

      const reports = ['report'];
      loadReports.withArgs(selected).returns(Promise.resolve(reports));
      globalActions.loadSelectedReports();


      setTimeout(() => {
        const state = getState();
      const globalState = selectors.getGlobalState(state);
        chai.expect(state).to.not.equal(initialState);
        chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
        chai.expect(globalState).to.deep.equal({ selected: { _id: '1', reports }, loadingSelectedReports: false });
        done();
      });
    });

    it('adds a message to selected', () => {
      const message1 = { id: '1' };
      const message2 = { id: '2' };
      const initialState = createGlobalState({ selected: { messages: [message1] } });
      setupStore(initialState);

      globalActions.addSelectedMessage(message2);

      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState.selected.messages).to.not.equal(selectors.getGlobalState(initialState).selected.messages);
      chai.expect(globalState).to.deep.equal({ selected: { messages: [message1, message2]} });
    });

    it('removes a message from selected', () => {
      const message1 = { id: '1' };
      const message2 = { id: '2' };
      const initialState = createGlobalState({ selected: { messages: [message1, message2] } });
      setupStore(initialState);

      globalActions.removeSelectedMessage('1');

      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState.selected.messages).to.not.equal(selectors.getGlobalState(initialState).selected.messages);
      chai.expect(globalState).to.deep.equal({ selected: { messages: [message2]} });
    });

    it('adds a selected item', () => {
      const item1 = { id: '1' };
      const item2 = { id: '2' };
      const initialState = createGlobalState({ selected: [item1] });
      setupStore(initialState);

      globalActions.addSelected(item2);

      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState).to.deep.equal({ selected: [item1, item2] });
    });

    it('removes a selected item', () => {
      const item1 = { _id: '1' };
      const item2 = { _id: '2' };
      const initialState = createGlobalState({ selected: [item1, item2] });
      setupStore(initialState);

      globalActions.removeSelected('1');

      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState.selected).to.not.equal(selectors.getGlobalState(initialState).selected);
      chai.expect(globalState).to.deep.equal({ selected: [item2] });
    });

    it('sets loadingContent', () => {
      const initialState = createGlobalState({ loadingContent: false });
      setupStore(initialState);
      globalActions.setLoadingContent(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ loadingContent: true });
    });

    it('sets loadingSubActionBar', () => {
      const initialState = createGlobalState({ loadingSubActionBar: false });
      setupStore(initialState);
      globalActions.setLoadingSubActionBar(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ loadingSubActionBar: true });
    });

    it('sets showActionBar', () => {
      const initialState = createGlobalState({ showActionBar: false });
      setupStore(initialState);
      globalActions.setShowActionBar(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ showActionBar: true });
    });

    it('sets showContent', () => {
      const initialState = createGlobalState({ showContent: false });
      setupStore(initialState);
      globalActions.setShowContent(true);
      const state = getState();
      const globalState = selectors.getGlobalState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(globalState).to.deep.equal({ showContent: true });
    });
  });
});
