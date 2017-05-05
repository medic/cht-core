describe('ContactsContentCtrl', () => {
  'use strict';

  const FETCH_CHILDREN_VIEW = 'medic-client/contacts_by_parent_name_type';

  let assert = chai.assert,
      childContactPerson,
      childPerson,
      childPerson2,
      childPlace,
      childPlace2,
      childPlaceIcon,
      childPlacePluralLabel,
      createController,
      dbGet,
      dbQuery,
      doc,
      getVisibleFields,
      idStateParam,
      scope,
      search,
      stubGetQuery,
      stubGetVisibleFields,
      stubFetchChildren,
      stubSearch,
      stubTasksForContact,
      stubContactViewModelGenerator,
      contactViewModelGenerator,
      tasksForContact;

  beforeEach(module('inboxApp'));

  beforeEach(inject((_$rootScope_, $controller) => {
    const $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = selected => scope.selected = selected;
    scope.clearSelected = sinon.stub();
    scope.settingSelected = sinon.stub();
    const log = { error: console.error, debug: console.info };

    const parentId = 'districtsdistrict';
    const contactId = 'mario';
    childContactPerson = { _id: contactId, type: 'person', parent: { _id: parentId } };
    childPerson = { _id: 'peach', type: 'person', name: 'Peach', date_of_birth: '1986-01-01' };
    childPerson2 = { _id: 'zelda', type: 'person', name: 'Zelda', date_of_birth: '1985-01-01' };
    childPlace = { _id: 'happyplace', type: 'mushroom', name: 'Happy Place' };
    childPlace2 = { _id: 'happyplace2', type: 'mushroom', name: 'Happy Place 2' };
    childPlacePluralLabel = 'mushroompodes';
    childPlaceIcon = 'fa-mushroom';
    doc = {
      _id: parentId,
      type: 'clinic',
      contact: { _id: contactId }
    };
    contactViewModelGenerator = sinon.stub();
    dbGet = sinon.stub();
    dbQuery = sinon.stub();
    const db = () => {
      return {
        get: dbGet,
        query: dbQuery
      };
    };
    stubContactViewModelGenerator = doc => {
      contactViewModelGenerator.withArgs(doc._id).returns(KarmaUtils.mockPromise(null, { doc: doc }));
    };
    stubGetQuery = (err, doc) => {
      dbGet.withArgs(doc._id).returns(KarmaUtils.mockPromise(err, doc));
    };
    stubFetchChildren = childrenArray => {
      const rows = childrenArray.map(doc => {
        return { doc: doc, id: doc._id };
      });
      dbQuery.withArgs(sinon.match(FETCH_CHILDREN_VIEW), sinon.match.any)
        .returns(KarmaUtils.mockPromise(null, { rows: rows }));
    };
    search = sinon.stub();
    stubSearch = (err, reports, callNumber) => {
      if (callNumber) {
        search.onCall(callNumber).returns(KarmaUtils.mockPromise(err, reports));
      }
      else {
        search.returns(KarmaUtils.mockPromise(err, reports));
      }
    };
    stubSearch(null, []);

    getVisibleFields = sinon.stub();
    stubGetVisibleFields = type => {
      const fields = {};
      fields[type] = { fields: [] };
      getVisibleFields.returns(fields);
    };

    tasksForContact = sinon.stub();
    stubTasksForContact = tasks => {
      tasksForContact.callsArgWith(4, true, tasks);
    };

    createController = () => {
      return $controller('ContactsContentCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': log,
        '$q': Q,
        '$stateParams': idStateParam,
        'Changes': () => {
          return { unsubscribe: () => {} };
        },
        'ContactSchema': {
          getVisibleFields: getVisibleFields,
          get: () => {
            return {
              pluralLabel: childPlacePluralLabel,
              icon: childPlaceIcon
            };
          }
        },
        'DB': db,
        'Search': search,
        'TasksForContact': tasksForContact,
        'UserSettings': KarmaUtils.promiseService(null, ''),
        'ContactViewModelGenerator': contactViewModelGenerator
      });
    };
  }));

  afterEach(() => {
    KarmaUtils.restore(dbGet, dbQuery, getVisibleFields, search);
  });

  describe('Place', () => {
    const runPlaceTest = (childrenArray, assertions) => {
      idStateParam = { id: doc._id };
      stubContactViewModelGenerator(doc);
      stubGetQuery(null, childContactPerson);
      stubGetVisibleFields(doc.type);
      stubFetchChildren(childrenArray);
      return createController().getSetupPromiseForTesting().then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        assertions(scope.selected);
      });
    };

    it('contact passed in $stateParams is selected', () => {
      return runPlaceTest([childContactPerson, childPlace], selected => {
        assert.equal(selected.doc._id, doc._id);
      });
    });

    it('child places and persons get displayed separately', () => {
      return runPlaceTest([childContactPerson, childPlace], selected => {
        assert.equal(selected.children.persons.length, 1);
        assert.deepEqual(selected.children.persons[0].doc, childContactPerson);
        assert.equal(selected.children.places.length, 1);
        assert.deepEqual(selected.children.places[0].doc, childPlace);
        assert.deepEqual(selected.children.childPlacesLabel, childPlacePluralLabel);
        assert.deepEqual(selected.children.childPlacesIcon, childPlaceIcon);
      });
    });

    it('if no child places, child persons get displayed', () => {
      return runPlaceTest([childContactPerson, childPerson], selected => {
        assert.equal(selected.children.persons.length, 2);
        assert.equal(selected.children.places, undefined);
      });
    });

    it('if no child persons, child places get displayed', () => {
      delete doc.contact;
      return runPlaceTest([childPlace], selected => {
        assert.equal(selected.children.persons.length, 0);
        assert.equal(selected.children.places.length, 1);
        assert.deepEqual(selected.children.places[0].doc, childPlace);
        assert.deepEqual(selected.children.childPlacesLabel, childPlacePluralLabel);
        assert.deepEqual(selected.children.childPlacesIcon, childPlaceIcon);
      });
    });

    it('contact person gets displayed on top', () => {
      return runPlaceTest([childPerson, childContactPerson], selected => {
        assert.deepEqual(selected.children.persons[0].doc, childContactPerson);
        assert(selected.children.persons[0].isPrimaryContact, 'has isPrimaryContact flag');
      });
    });

    it('if no contact in parent, persons still get displayed', () => {
      delete doc.contact;
      return runPlaceTest([childPerson, childContactPerson], selected => {
        assert.equal(selected.children.persons.length, 2);
      });
    });

    it('if no contact person in children, persons still get displayed', () => {
      idStateParam = { id: doc._id };
      stubContactViewModelGenerator(doc);
      stubGetQuery({ status: 404 }, childContactPerson);
      stubGetVisibleFields(doc.type);
      stubFetchChildren([childPerson]);
      return createController().getSetupPromiseForTesting().then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        assert.equal(scope.selected.children.persons.length, 1);
      });
    });

    it('if contact doesn\'t belong to place, it still gets displayed', () => {
      return runPlaceTest([], selected => {
        assert.equal(selected.children.persons.length, 1);
        assert.equal(selected.children.persons[0].id, childContactPerson._id);
        assert.equal(selected.children.persons[0].isPrimaryContact, true);
      });
    });

    it('child places are sorted in alphabetical order', () => {
      return runPlaceTest([childPlace2, childPlace], selected => {
        assert.equal(selected.children.places[0].doc._id, childPlace._id);
        assert.equal(selected.children.places[1].doc._id, childPlace2._id);
      });
    });

    it('child persons are sorted in alphabetical order', () => {
      doc.type = 'star';
      return runPlaceTest([childPerson2, childPerson], selected => {
        // Remove the primary contact
        selected.children.persons.splice(0, 1);
        assert.equal(selected.children.persons[0].doc._id, childPerson._id);
        assert.equal(selected.children.persons[1].doc._id, childPerson2._id);
      });
    });

    it('when selected doc is a clinic, child places are sorted in alphabetical order (like for other places)', () => {
      doc.type = 'clinic';
      return runPlaceTest([childPlace2, childPlace], selected => {
        assert.equal(selected.children.places[0].doc._id, childPlace._id);
        assert.equal(selected.children.places[1].doc._id, childPlace2._id);
      });
    });

    it('when selected doc is a clinic, child persons are sorted by age', () => {
      doc.type = 'clinic';
      return runPlaceTest([childPerson2, childPerson], selected => {
        // Remove the primary contact
        selected.children.persons.splice(0, 1);
        assert.equal(selected.children.persons[0].doc._id, childPerson2._id);
        assert.equal(selected.children.persons[1].doc._id, childPerson._id);
      });
    });
  });

  describe('Person', () => {
    const runPersonTest = (parentDoc, getParentError, assertions) => {
      // Selected doc is childContactPerson
      idStateParam = { id: childContactPerson._id };
      stubContactViewModelGenerator(childContactPerson);
      stubGetVisibleFields(childContactPerson.type);
      // Fetch parent doc
      stubGetQuery(getParentError, parentDoc);

      return createController().getSetupPromiseForTesting().then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        assertions(scope.selected);
      });
    };

    describe('isPrimaryContact flag', () => {

      it('if selected doc is primary contact, the isPrimaryContact flag should be true', () => {
        return runPersonTest(doc, null, selected => {
          assert(selected.isPrimaryContact, 'isPrimaryContact flag should be true');
        });
      });

      it('if selected doc has no parent field, the isPrimaryContact flag should be false', () => {
        delete childContactPerson.parent;
        return runPersonTest(doc, null, selected => {
          assert(!selected.isPrimaryContact, 'isPrimaryContact flag should be false');
        });
      });

      it('if selected doc\'s parent is not found, the isPrimaryContact flag should be false', () => {
        return runPersonTest(doc, { status: 404 }, selected => {
          assert(!selected.isPrimaryContact, 'isPrimaryContact flag should be false');
        });
      });

    });
  });

  describe('Reports', () => {
    const runReportsTest = (childrenArray, assertions) => {
      idStateParam = { id: doc._id };
      stubContactViewModelGenerator(doc);
      // No contact person.
      stubGetQuery({ status: 404 }, childContactPerson);
      stubGetVisibleFields(doc.type);
      stubFetchChildren(childrenArray);
      return createController().getSetupPromiseForTesting().then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        assertions(scope.selected);
      });
    };

    it('sets the returned reports as selected', () => {
      stubSearch(null, [ { _id: 'ab' } ]);
      return runReportsTest([], selected => {
        chai.expect(selected.reports.length).to.equal(1);
        chai.expect(selected.reports[0]._id).to.equal('ab');
      });
    });

    it('sorts reports by reported_date', () => {
      const report1 = { _id: 'ab', reported_date: 123 };
      const report2 = { _id: 'cd', reported_date: 456 };
      stubSearch(null, [ report1, report2]);
      return runReportsTest([], selected => {
        chai.expect(selected.reports.length).to.equal(2);
        chai.expect(selected.reports[0]._id).to.equal(report2._id);
        chai.expect(selected.reports[1]._id).to.equal(report1._id);
      });
    });

    it('includes reports from child places', () => {
      stubSearch(null, [ { _id: 'ab' } ]);
      return runReportsTest([childPerson, childPerson2], selected => {
        chai.expect(search.callCount).to.equal(2);

        const parentSearchArgs = search.args[0][1].subjectIds;
        chai.assert.sameMembers(parentSearchArgs, [ doc._id ]);
        const childSearchArgs = search.args[1][1].subjectIds;
        chai.assert.sameMembers(childSearchArgs, [ childPerson._id, childPerson2._id ]);

        chai.expect(selected.reports.length).to.equal(2);
        chai.expect(selected.reports[0]._id).to.equal('ab');
        chai.expect(selected.reports[1]._id).to.equal('ab');
      });
    });

    it('sorts reports by reported_date, not by parent vs. child', () => {
      const expectedReports = [ { _id: 'aa', reported_date: 123 }, { _id: 'bb', reported_date: 345 } ];
      stubSearch(null, [ expectedReports[0] ], 0);
      stubSearch(null, [ expectedReports[1] ], 1);
      return runReportsTest([childPerson, childPerson2], selected => {
        chai.expect(search.callCount).to.equal(2);

        const parentSearchArgs = search.args[0][1].subjectIds;
        chai.assert.sameMembers(parentSearchArgs, [ doc._id ]);
        const childSearchArgs = search.args[1][1].subjectIds;
        chai.assert.sameMembers(childSearchArgs, [ childPerson._id, childPerson2._id ]);

        chai.assert.deepEqual(selected.reports, [ expectedReports[1], expectedReports[0]]);
      });
    });

    it('includes subjectIds in reports search so JSON reports are found', () => {
      doc.patient_id = 'cd';
      doc.place_id = 'ef';
      stubSearch(null, [ { _id: 'ab' } ]);
      return runReportsTest([], () => {
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0][0]).to.equal('reports');
        chai.expect(search.args[0][1].subjectIds.length).to.equal(3);
        chai.expect(search.args[0][1].subjectIds).to.include(doc._id);
        chai.expect(search.args[0][1].subjectIds).to.include('cd');
        chai.expect(search.args[0][1].subjectIds).to.include('ef');
      });
    });
  });

  describe('Tasks', () => {
    const runTasksTest = (childrenArray, assertions) => {
      idStateParam = { id: doc._id };
      stubContactViewModelGenerator(doc);
      // No contact person.
      stubGetQuery({ status: 404 }, childContactPerson);
      stubGetVisibleFields(doc.type);
      stubFetchChildren(childrenArray);
      return createController().getSetupPromiseForTesting().then(() => {
        assert(scope.selected, 'selected should be set on the scope');
        assertions(scope.selected);
      });
    };

    it('displays tasks for selected contact', () => {
      const task = { _id: 'aa', contact: { _id: doc._id } };
      stubTasksForContact([task]);
      return runTasksTest([], selected => {
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
      return runTasksTest([ childPerson ], selected => {
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
