describe('ContactsContentCtrl', () => {
  'use strict';

  let assert = chai.assert,
      controller,
      stateParams,
      scope,
      state,
      contactViewModelGenerator,
      tasksForContact,
      changes,
      changesCallback,
      changesFilter,
      contactChangeFilter = sinon.stub(),
      debounce;

  const childPerson = {
    _id: 'peach',
    type: 'person',
    name: 'Peach',
    date_of_birth: '1986-01-01'
  };

  const doc = {
    _id: 'districtsdistrict',
    type: 'clinic',
    contact: { _id: 'mario' },
    children: { persons: [ ] }
  };

  const stubContactViewModelGenerator = (doc, childArray) => {
    const childRows = childArray.map(child => {
      return { id: child._id, doc: child };
    });
    const model = {
      doc: doc,
      children: { persons: childRows }
    };

    contactViewModelGenerator.returns(Promise.resolve());
    contactViewModelGenerator.withArgs(doc._id)
      .returns(Promise.resolve(model));
  };

  const stubTasksForContact = tasks => {
    tasksForContact.callsArgWith(4, true, tasks);
  };

  const createController = () => {
    return controller('ContactsContentCtrl', {
      '$scope': scope,
      '$q': Q,
      '$state': state,
      '$stateParams': stateParams,
      'Changes': changes,
      'Auth': () => {
        return Promise.resolve();
      },
      'ContactViewModelGenerator': contactViewModelGenerator,
      'TasksForContact': tasksForContact,
      'UserSettings': KarmaUtils.promiseService(null, ''),
      'ContactChangeFilter': contactChangeFilter,
      'Debounce': debounce
    });
  };

  beforeEach(module('inboxApp'));

  beforeEach(inject((_$rootScope_, $controller) => {
    scope = _$rootScope_.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = selected => scope.selected = selected;
    scope.clearSelected = sinon.stub();
    scope.settingSelected = sinon.stub();
    state = {
      current: {
        name: 'something'
      },
      go: sinon.stub()
    };

    controller = $controller;

    contactViewModelGenerator = sinon.stub();
    tasksForContact = sinon.stub();
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

  describe('Tasks', () => {
    const runTasksTest = childrenArray => {
      stateParams = { id: doc._id };
      stubContactViewModelGenerator(doc, childrenArray);
      return createController().setupPromise.then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        return scope.selected;
      });
    };

    it('displays tasks for selected contact', () => {
      const task = { _id: 'aa', contact: { _id: doc._id } };
      stubTasksForContact([ task ]);
      return runTasksTest([]).then(selected => {
        chai.assert.equal(tasksForContact.callCount, 1);
        chai.assert.equal(tasksForContact.args[0][0], doc._id);
        chai.assert.equal(tasksForContact.args[0][1], doc.type);
        chai.assert.equal(tasksForContact.args[0][2].length, 0);
        chai.assert.sameMembers(selected.tasks, [ task ]);
        chai.assert(selected.areTasksEnabled);
      });
    });

    it('displays tasks for selected place and child persons', () => {
      const tasks = [
        {
          _id: 'taskForParent',
          date: 'Wed Oct 19 2016 13:50:16 GMT+0200 (CEST)',
          contact: { _id: doc._id }
        },
        {
          _id: 'taskForChild',
          date: 'Wed Sep 28 2016 13:50:16 GMT+0200 (CEST)',
          contact: { _id: childPerson._id }
        }
      ];
      stubTasksForContact(tasks);
      return runTasksTest([ childPerson ]).then(selected => {
        chai.assert.equal(tasksForContact.callCount, 1);
        chai.assert.equal(tasksForContact.args[0][0], doc._id);
        chai.assert.equal(tasksForContact.args[0][1], doc.type);
        chai.assert.sameMembers(tasksForContact.args[0][2], [ childPerson._id ]);
        chai.assert.sameMembers(selected.tasks, tasks);
        chai.assert(selected.areTasksEnabled);
      });
    });
  });

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
      stubContactViewModelGenerator(doc,  []);
      return createController().setupPromise.then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        return scope.selected;
      });
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
          chai.assert.equal(contactViewModelGenerator.callCount, 2);
          chai.assert.equal(contactViewModelGenerator.getCall(1).args[0], doc._id);
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
        chai.assert.equal(contactViewModelGenerator.callCount, 1);
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
        chai.assert.equal(contactViewModelGenerator.callCount, 1);
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
          chai.assert.equal(contactViewModelGenerator.callCount, 2);
          chai.assert.equal(contactViewModelGenerator.getCall(1).args, doc._id);
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
          chai.assert.equal(contactViewModelGenerator.callCount, 2);
          chai.assert.equal(contactViewModelGenerator.getCall(1).args, doc._id);
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
        chai.assert.equal(contactViewModelGenerator.callCount, 1);
        chai.assert.equal(scope.clearSelected.callCount, 0);
      });
    });
  });

});
