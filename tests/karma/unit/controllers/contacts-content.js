describe('ContactsContentCtrl', function() {
  'use strict';

  var FETCH_CHILDREN_VIEW = 'medic-client/contacts_by_parent_name_type';

  var assert = chai.assert,
    childContactPerson,
    childPerson,
    childPerson2,
    childPlace,
    childPlace2,
    childPlaceIcon,
    childPlacePluralLabel,
    createController,
    doc,
    search,
    idStateParam,
    scope,
    stubGetQuery,
    stubGetVisibleFields,
    stubFetchChildren,
    stubSearch;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    var $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = function(selected) {
      scope.selected = selected;
    };
    scope.clearSelected = sinon.stub();
    scope.settingSelected = sinon.stub();
    var log = { error: console.error, debug: console.info };

    var parentId = 'districtsdistrict';
    var contactId = 'mario';
    childContactPerson = { _id: contactId, type: 'person', parent: { _id: parentId } };
    childPerson = { _id: 'peach', type: 'person', name: 'Peach', date_of_birth: '1986-01-01' };
    childPerson2 = { _id: 'zelda', type: 'person', name: 'Zelda', date_of_birth: '1985-01-01' };
    childPlace = { _id: 'happyplace', type: 'mushroom', name: 'Happy Place' };
    childPlace2 = { _id: 'happyplace2', type: 'mushroom', name: 'Happy Place 2' };
    childPlacePluralLabel = 'mushroompodes';
    childPlaceIcon = 'fa-mushroom';
    doc = {
      _id: parentId,
      type: 'star',
      contact: { _id: contactId }
    };
    var dbGet = sinon.stub();
    var dbQuery = sinon.stub();
    var db = function() {
      return {
        get: dbGet,
        query: dbQuery
      };
    };
    stubGetQuery = function(err, doc) {
      db().get.withArgs(doc._id).returns(KarmaUtils.mockPromise(err, doc));
    };
    stubFetchChildren = function(childrenArray) {
      var rows = childrenArray.map(function(doc) {
        return { doc: doc };
      });
      db().query.withArgs(sinon.match(FETCH_CHILDREN_VIEW), sinon.match.any)
        .returns(KarmaUtils.mockPromise(null, { rows: rows }));
    };
    search = sinon.stub();
    search.returns(KarmaUtils.mockPromise(null, []));
    stubSearch = function(err, reports) {
      search.returns(KarmaUtils.mockPromise(err, reports));
    };

    var getVisibleFields = sinon.stub();
    stubGetVisibleFields = function(type) {
      var fields = {};
      fields[type] = { fields: [] };
      getVisibleFields.returns(fields);
    };
    createController = function() {
      return $controller('ContactsContentCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': log,
        '$q': Q,
        '$stateParams': idStateParam,
        'Changes': sinon.stub(),
        'ContactSchema': {
          getVisibleFields: getVisibleFields,
          get: function() {
            return {
              pluralLabel: childPlacePluralLabel,
              icon: childPlaceIcon
            };
          }
        },
        'DB': db,
        'RulesEngine': { listen: function() {} },
        'Search': search,
        'UserSettings': KarmaUtils.promiseService(null, '')
      });
    };
  }));

  describe('Place', function() {
    var runPlaceTest = function(done, childrenArray, assertions) {
      idStateParam = { id: doc._id };
      stubGetQuery(null, doc);
      stubGetVisibleFields(doc.type);
      stubFetchChildren(childrenArray);
      createController().getSetupPromiseForTesting()
        .then(function() {
          assertions(scope.selected);
          done();
        }).catch(done);
    };

    it('setSelected contact passed in $stateParams', function(done) {
      runPlaceTest(done, [childContactPerson, childPlace], function(selected) {
        assert.equal(selected.doc._id, doc._id);
      });
    });

    it('child places and persons get displayed separately', function(done) {
      runPlaceTest(done, [childContactPerson, childPlace], function(selected) {
        assert.equal(selected.children.persons.length, 1);
        assert.deepEqual(selected.children.persons[0].doc, childContactPerson);
        assert.equal(selected.children.places.length, 1);
        assert.deepEqual(selected.children.places[0].doc, childPlace);
        assert.deepEqual(selected.children.childPlacesLabel, childPlacePluralLabel);
        assert.deepEqual(selected.children.childPlacesIcon, childPlaceIcon);
      });
    });

    it('if no child places, child persons get displayed', function(done) {
      runPlaceTest(done, [childContactPerson, childPerson], function(selected) {
        assert.equal(selected.children.persons.length, 2);
        assert.equal(selected.children.places, undefined);
      });
    });

    it('if no child persons, child places get displayed', function(done) {
      runPlaceTest(done, [childPlace], function(selected) {
        assert.equal(selected.children.persons.length, 0);
        assert.equal(selected.children.places.length, 1);
        assert.deepEqual(selected.children.places[0].doc, childPlace);
        assert.deepEqual(selected.children.childPlacesLabel, childPlacePluralLabel);
        assert.deepEqual(selected.children.childPlacesIcon, childPlaceIcon);
      });
    });

    it('contact person gets displayed on top', function(done) {
      runPlaceTest(done, [childPerson, childContactPerson], function(selected) {
        assert.deepEqual(selected.children.persons[0].doc, childContactPerson);
        assert(selected.children.persons[0].doc.isPrimaryContact, 'has isPrimaryContact flag');
      });
    });

    it('if no contact in parent, persons still get displayed', function(done) {
      delete doc.contact;
      runPlaceTest(done, [childPerson, childContactPerson], function(selected) {
        assert.equal(selected.children.persons.length, 2);
      });
    });

    it('if no contact person in children, persons still get displayed', function(done) {
      runPlaceTest(done, [childPerson], function(selected) {
        assert.equal(selected.children.persons.length, 1);
      });
    });

    it('child places are sorted in alphabetical order', function(done) {
      runPlaceTest(done, [childPlace2, childPlace], function(selected) {
        assert.equal(selected.children.places[0].doc._id, childPlace._id);
        assert.equal(selected.children.places[1].doc._id, childPlace2._id);
      });
    });

    it('child persons are sorted in alphabetical order', function(done) {
      runPlaceTest(done, [childPerson2, childPerson], function(selected) {
        assert.equal(selected.children.persons[0].doc._id, childPerson._id);
        assert.equal(selected.children.persons[1].doc._id, childPerson2._id);
      });
    });

    it('when selected doc is a clinic, child places are sorted in alphabetical order (like for other places)', function(done) {
      doc.type = 'clinic';
      runPlaceTest(done, [childPlace2, childPlace], function(selected) {
        assert.equal(selected.children.places[0].doc._id, childPlace._id);
        assert.equal(selected.children.places[1].doc._id, childPlace2._id);
      });
    });

    it('when selected doc is a clinic, child persons are sorted by age', function(done) {
      doc.type = 'clinic';
      runPlaceTest(done, [childPerson2, childPerson], function(selected) {
        assert.equal(selected.children.persons[0].doc._id, childPerson2._id);
        assert.equal(selected.children.persons[1].doc._id, childPerson._id);
      });
    });
  });

  describe('Person', function() {
    var runPersonTest = function(done, parentDoc, getParentError, assertions) {
      // Selected doc is childContactPerson
      idStateParam = { id: childContactPerson._id };
      stubGetQuery(null, childContactPerson);
      stubGetVisibleFields(childContactPerson.type);
      // Fetch parent doc
      stubGetQuery(getParentError, parentDoc);

      createController().getSetupPromiseForTesting()
        .then(function() {
          assertions(scope.selected);
          done();
        }).catch(done);
    };

    it('if selected doc is primary contact, the isPrimaryContact flag should be true', function(done) {
      runPersonTest(done, doc, null, function(selected) {
        assert(selected.doc.isPrimaryContact, 'isPrimaryContact flag should be true');
      });
    });

    it('if selected doc has no parent field, the isPrimaryContact flag should be false', function(done) {
      delete childContactPerson.parent;
      runPersonTest(done, doc, null, function(selected) {
        assert(!selected.doc.isPrimaryContact, 'isPrimaryContact flag should be false');
      });
    });

    it('if selected doc\'s parent is not found, the isPrimaryContact flag should be false', function(done) {
      runPersonTest(done, doc, { status: 404 }, function(selected) {
        assert(!selected.doc.isPrimaryContact, 'isPrimaryContact flag should be false');
      });
    });

    it('includes subjectIds in reports search so JSON reports are found', function(done) {
      childContactPerson.patient_id = 'cd';
      childContactPerson.place_id = 'ef';
      stubSearch(null, [ { _id: 'ab' } ]);
      runPersonTest(done, doc, null, function(selected) {
        chai.expect(selected.reports.length).to.equal(1);
        chai.expect(selected.reports[0]._id).to.equal('ab');
        chai.expect(search.callCount).to.equal(1);
        chai.expect(search.args[0][0]).to.equal('reports');
        chai.expect(search.args[0][1].subjectIds.length).to.equal(3);
        chai.expect(search.args[0][1].subjectIds).to.include(childContactPerson._id);
        chai.expect(search.args[0][1].subjectIds).to.include('cd');
        chai.expect(search.args[0][1].subjectIds).to.include('ef');
      });
    });

  });
});