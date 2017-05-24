describe('ContactsContentCtrl', () => {
  'use strict';

  let assert = chai.assert,
      controller,
      stateParams,
      scope,
      contactViewModelGenerator,
      tasksForContact;

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
    contactViewModelGenerator.withArgs(doc._id)
      .returns(KarmaUtils.mockPromise(null, model));
  };

  const stubTasksForContact = tasks => {
    tasksForContact.callsArgWith(4, true, tasks);
  };

  const createController = () => {
    return controller('ContactsContentCtrl', {
      '$scope': scope,
      '$q': Q,
      '$stateParams': stateParams,
      'Changes': () => {
        return { unsubscribe: () => {} };
      },
      'ContactViewModelGenerator': contactViewModelGenerator,
      'TasksForContact': tasksForContact,
      'UserSettings': KarmaUtils.promiseService(null, '')
    });
  };

  beforeEach(module('inboxApp'));

  beforeEach(inject((_$rootScope_, $controller) => {
    scope = _$rootScope_.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = selected => scope.selected = selected;
    scope.clearSelected = sinon.stub();
    scope.settingSelected = sinon.stub();

    controller = $controller;

    contactViewModelGenerator = sinon.stub();
    tasksForContact = sinon.stub();
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

});
