describe('ContactsContentCtrl', () => {
  'use strict';

  let actions,
      controller,
      stateParams,
      scope,
      state,
      getContact,
      changes,
      changesCallback,
      changesFilter,
      contactChangeFilter = sinon.stub(),
      debounce;

  const stubGetContact = (doc, childArray) => {
    const childRows = childArray.map(child => {
      return { id: child._id, doc: child };
    });
    const model = {
      doc: doc,
      children: { persons: childRows }
    };

    getContact.returns(Promise.resolve());
    getContact.withArgs(doc._id)
      .returns(Promise.resolve(model));
  };

  const createController = () => {
    return controller('ContactsContentCtrl', {
      '$scope': scope,
      '$q': Q,
      '$state': state,
      '$stateParams': stateParams,
      'Changes': changes,
      'ContactViewModelGenerator': { getContact: getContact },
      'UserSettings': KarmaUtils.promiseService(null, ''),
      'ContactChangeFilter': contactChangeFilter,
      'Debounce': debounce
    });
  };

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, Actions) => {
    actions = Actions($ngRedux.dispatch);

    scope = _$rootScope_.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = selected => actions.setSelected(selected);
    scope.clearSelected = sinon.stub();
    scope.settingSelected = sinon.stub();
    state = {
      current: {
        name: 'something'
      },
      go: sinon.stub()
    };

    controller = $controller;

    getContact = sinon.stub();
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
    let doc,
        change;

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
      stateParams = { id: doc._id};
      stubGetContact(doc,  []);
      return createController().setupPromise;
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
        return changesCallback(change).then(() => {
          chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
          chai.assert.equal(getContact.callCount, 2);
          chai.assert.equal(getContact.getCall(1).args[0], doc._id);
          chai.assert.equal(scope.clearSelected.callCount, 0);
        });
      });
    });

    it('redirects to parent when selected contact is deleted', () => {
      doc.parent = { _id: 'parent_id' };

      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: true, isDeleted: true });
        chai.assert.equal(changesFilter(change), true);
        changesCallback(change);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
        chai.assert.equal(getContact.callCount, 1);
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
        chai.assert.equal(getContact.callCount, 1);
        chai.assert.equal(scope.clearSelected.callCount, 1);
      });
    });

    it('updates information when relevant contact change is received', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: false, isRelevantContact: true });
        chai.assert.equal(changesFilter(change), true);
        return changesCallback(change).then(() => {
          chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
          chai.assert.equal(contactChangeFilter.isRelevantContact.callCount, 1);
          chai.assert.equal(getContact.callCount, 2);
          chai.assert.equal(getContact.getCall(1).args[0], doc._id);
          chai.assert.equal(scope.clearSelected.callCount, 0);
        });
      });
    });

    it('updates information when relevant report change is received', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: false, isRelevantReport: true, isRelevantContact: false });
        chai.assert.equal(changesFilter(change), true);
        return changesCallback(change).then(() => {
          chai.assert.equal(contactChangeFilter.matchContact.callCount, 2);
          chai.assert.equal(contactChangeFilter.isRelevantContact.callCount, 1);
          chai.assert.equal(contactChangeFilter.isRelevantReport.callCount, 1);
          chai.assert.equal(getContact.callCount, 2);
          chai.assert.equal(getContact.getCall(1).args[0], doc._id);
          chai.assert.equal(scope.clearSelected.callCount, 0);
        });
      });
    });

    it('does not update information when irrelevant change is received', () => {
      return runChangeFeedProcessTest().then(() => {
        stubContactChangeFilter({ matchContact: false, isRelevantReport: false, isRelevantContact: false });
        chai.assert.equal(changesFilter(change), false);
        chai.assert.equal(contactChangeFilter.matchContact.callCount, 1);
        chai.assert.equal(contactChangeFilter.isRelevantContact.callCount, 1);
        chai.assert.equal(contactChangeFilter.isRelevantReport.callCount, 1);
        chai.assert.equal(getContact.callCount, 1);
        chai.assert.equal(scope.clearSelected.callCount, 0);
      });
    });
  });

});
