describe('Store', function() {
  'use strict';

  let globalActions,
      analyticsActions,
      contactsActions,
      messagesActions,
      reportsActions,
      tasksActions,
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
    inject(function(
      $ngRedux,
      AnalyticsActions,
      ContactsActions,
      GlobalActions,
      MessagesActions,
      ReportsActions,
      Selectors,
      TasksActions
    ) {
      globalActions = GlobalActions($ngRedux.dispatch);
      analyticsActions = AnalyticsActions($ngRedux.dispatch);
      contactsActions = ContactsActions($ngRedux.dispatch);
      messagesActions = MessagesActions($ngRedux.dispatch);
      reportsActions = ReportsActions($ngRedux.dispatch);
      tasksActions = TasksActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  }

  function createGlobalState(state) {
    return { global: state };
  }

  function createAnalyticsState(state) {
    return { analytics: state };
  }

  function createContactsState(state) {
    return { contacts: state };
  }

  function createMessagesState(state) {
    return { messages: state };
  }

  function createReportsState(state) {
    return { reports: state };
  }

  function createTasksState(state) {
    return { tasks: state };
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

  describe('Analytics', () => {
    it('sets selected analytics', () => {
      const initialState = createAnalyticsState({ selected: null });
      setupStore(initialState);
      const selected = {};
      analyticsActions.setSelectedAnalytics(selected);
      const state = getState();
      const analyticsState = selectors.getAnalyticsState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(analyticsState).to.deep.equal({ selected });
    });
  });

  describe('Contacts', () => {
    it('sets selected contact', () => {
      const initialState = createContactsState({ selected: null });
      setupStore(initialState);
      const selected = {};
      contactsActions.setSelectedContact(selected);
      const state = getState();
      const contactsState = selectors.getContactsState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(contactsState).to.deep.equal({ selected });
    });

    it('updates selected contact', () => {
      const initialState = createContactsState({ selected: { doc: '1' } });
      setupStore(initialState);
      const selected = { doc: '2' };
      contactsActions.updateSelectedContact(selected);
      const state = getState();
      const contactsState = selectors.getContactsState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(contactsState.selected).to.not.equal(selectors.getContactsState(initialState).selected);
      chai.expect(contactsState).to.deep.equal({ selected });
    });

    it('sets loadingSelectedContact', () => {
      const initialState = createContactsState({ loadingSelectedChildren: false, loadingSelectedReports: false });
      setupStore(initialState);
      contactsActions.setLoadingSelectedContact();
      const state = getState();
      const contactsState = selectors.getContactsState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(contactsState).to.deep.equal({ loadingSelectedChildren: true, loadingSelectedReports: true });
    });

    it('loads selected contact children', (done) => {
      const selected = { _id: '1' };
      const initialState = createContactsState({ selected });
      setupStore(initialState);

      const children = ['child'];
      loadChildren.withArgs(selected).returns(Promise.resolve(children));
      contactsActions.loadSelectedContactChildren();

      setTimeout(() => {
        const state = getState();
        const contactsState = selectors.getContactsState(state);
        chai.expect(state).to.not.equal(initialState);
        chai.expect(contactsState.selected).to.not.equal(selectors.getContactsState(initialState).selected);
        chai.expect(contactsState).to.deep.equal({ selected: { _id: '1', children }, loadingSelectedChildren: false });
        done();
      });
    });

    it('loads selected contact reports', (done) => {
      const selected = { _id: '1' };
      const initialState = createContactsState({ selected });
      setupStore(initialState);

      const reports = ['report'];
      loadReports.withArgs(selected).returns(Promise.resolve(reports));
      contactsActions.loadSelectedContactReports();


      setTimeout(() => {
        const state = getState();
        const contactsState = selectors.getContactsState(state);
        chai.expect(state).to.not.equal(initialState);
        chai.expect(contactsState.selected).to.not.equal(selectors.getContactsState(initialState).selected);
        chai.expect(contactsState).to.deep.equal({ selected: { _id: '1', reports }, loadingSelectedReports: false });
        done();
      });
    });
  });

  describe('Messages', () => {
    it('sets selected message', () => {
      const initialState = createMessagesState({ selected: null });
      setupStore(initialState);
      const selected = {};
      messagesActions.setSelectedMessage(selected);
      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState).to.deep.equal({ selected });
    });

    it('updates selected message', () => {
      const initialState = createMessagesState({ selected: { doc: '1' } });
      setupStore(initialState);
      const selected = { doc: '2' };
      messagesActions.updateSelectedMessage(selected);
      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
      chai.expect(messagesState).to.deep.equal({ selected });
    });

    it('adds a message to selected', () => {
      const message1 = { id: '1' };
      const message2 = { id: '2' };
      const initialState = createMessagesState({ selected: { messages: [message1] } });
      setupStore(initialState);

      messagesActions.addSelectedMessage(message2);

      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
      chai.expect(messagesState.selected.messages).to.not.equal(selectors.getMessagesState(initialState).selected.messages);
      chai.expect(messagesState).to.deep.equal({ selected: { messages: [message1, message2]} });
    });

    it('removes a message from selected', () => {
      const message1 = { id: '1' };
      const message2 = { id: '2' };
      const initialState = createMessagesState({ selected: { messages: [message1, message2] } });
      setupStore(initialState);

      messagesActions.removeSelectedMessage('1');

      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
      chai.expect(messagesState.selected.messages).to.not.equal(selectors.getMessagesState(initialState).selected.messages);
      chai.expect(messagesState).to.deep.equal({ selected: { messages: [message2]} });
    });
  });

  describe('Reports', () => {
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

  describe('Tasks', () => {
    it('sets selected task', () => {
      const initialState = createTasksState({ selected: null });
      setupStore(initialState);
      const selected = {};
      tasksActions.setSelectedTask(selected);
      const state = getState();
      const tasksState = selectors.getTasksState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(tasksState).to.deep.equal({ selected });
    });
  });
});
