describe('ContactsContentCtrl', () => {
  'use strict';

  const contactChangeFilter = sinon.stub();
  let contactsActions;
  let controller;
  let ctrl;
  let globalActions;
  let stateParams;
  let scope;
  let state;
  let changes;
  let changesCallback;
  let changesFilter;
  let debounce;
  let setSelectedContact;
  let getSelectedContact;

  const createController = () => {
    return controller('ContactsContentCtrl', {
      '$scope': scope,
      '$q': Q,
      '$state': state,
      '$stateParams': stateParams,
      'Changes': changes,
      'UserSettings': KarmaUtils.promiseService(null, ''),
      'ContactChangeFilter': contactChangeFilter,
      'Debounce': debounce,
      'GlobalActions': () => globalActions,
      'ContactsActions': () => contactsActions,
      'Selectors': {
        getSelectedContact,
        getLoadingContent: () => {},
        getLoadingSelectedContactChildren: () => {},
        getLoadingSelectedContactReports: () => {},
        getContactsLoadingSummary: () => {},
        getForms: () => {}
      }
    });
  };

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, GlobalActions) => {
    getSelectedContact = sinon.stub();
    setSelectedContact = sinon.stub().resolves();
    
    contactsActions = { setSelectedContact };
    globalActions = Object.assign({}, GlobalActions($ngRedux.dispatch), {
      unsetSelected: sinon.stub()
    });

    scope = _$rootScope_.$new();
    scope.setLoadingContent = sinon.stub();

    state = {
      current: {
        name: 'something'
      },
      go: sinon.stub()
    };

    controller = $controller;

    changes = (options) => {
      changesFilter = options.filter;
      changesCallback = options.callback;
      return {unsubscribe: () => {}};
    };

    debounce = (func) => {
      const fn = func;
      fn.cancel = () => {};
      return fn;
    };
  }));

  describe('Change feed process', () => {
    let doc;
    let change;

    beforeEach(() => {
      doc = {
        _id: 'districtsdistrict',
        type: 'clinic',
        contact: { _id: 'mario' },
        children: { persons: [ ] }
      };

      change = { doc: {} };
    });

    const runChangeFeedProcessTest = () => {
      stateParams = { id: doc._id };
      getSelectedContact.returns({ doc });
      ctrl = createController();
      return ctrl.setupPromise;
    };

    const stubContactChangeFilter = (config) => {
      _.each(config, (returnValues, method) => {
        contactChangeFilter[method] = sinon.stub();
        if (returnValues instanceof Array) {
          _.each(returnValues, (value, call) => {
            contactChangeFilter[method].onCall(call).returns(value);
          });
        } else {
          contactChangeFilter[method].returns(returnValues);
        }
      });
    };

    it('updates information when selected contact is updated', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: true, isDeleted: false });
        chai.assert.equal(changesFilter(change), true);
        changesCallback(change);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
        chai.assert.equal(ctrl.setSelectedContact.callCount, 2);
      });
    });

    it('redirects to parent when selected contact is deleted', () => {
      doc.parent = { _id: 'parent_id' };

      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: true, isDeleted: true });
        chai.assert.equal(changesFilter(change), true);
        changesCallback(change);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
        chai.assert.equal(state.go.callCount, 1);
        chai.assert.equal(state.go.getCall(0).args[1].id, doc.parent._id);
      });
    });

    it('clears when selected contact is deleted and has no parent', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: true, isDeleted: true });
        chai.assert.equal(changesFilter(change), true);
        changesCallback(changes);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
        chai.assert.equal(state.go.callCount, 1);
      });
    });

    it('updates information when relevant contact change is received', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: false, isRelevantContact: true });
        chai.assert.equal(changesFilter(change), true);
        changesCallback(change);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
        chai.assert.equal(contactChangeFilter.isRelevantContact.callCount, 1);
        chai.assert.equal(ctrl.setSelectedContact.callCount, 2);
      });
    });

    it('updates information when relevant report change is received', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: false, isRelevantReport: true, isRelevantContact: false });
        chai.assert.equal(changesFilter(change), true);
        changesCallback(change);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
        chai.assert.equal(contactChangeFilter.isRelevantContact.callCount, 1);
        chai.assert.equal(contactChangeFilter.isRelevantReport.callCount, 1);
        chai.assert.equal(ctrl.setSelectedContact.callCount, 2);
      });
    });

    it('does not update information when irrelevant change is received', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: false, isRelevantReport: false, isRelevantContact: false });
        chai.assert.equal(changesFilter(change), false);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 1);
        chai.assert.equal(contactChangeFilter.isRelevantContact.callCount, 1);
        chai.assert.equal(contactChangeFilter.isRelevantReport.callCount, 1);
        chai.assert.equal(ctrl.setSelectedContact.callCount, 1);
      });
    });
  });

});
