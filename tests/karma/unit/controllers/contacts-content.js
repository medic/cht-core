describe('ContactsContentCtrl', function() {
  'use strict';

  var assert = chai.assert,
    childContactPerson,
    childPerson,
    childPlace,
    childPlaceIcon,
    childPlacePluralLabel,
    createController,
    doc,
    idStateParam,
    scope,
    stubGetQuery,
    stubGetVisibleFields,
    stubViewQuery;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    var $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = sinon.stub();
    scope.clearSelected = sinon.stub();
    var log = { error: console.error, debug: console.info };

    var parentId = 'districtsdistrict';
    var contactId = 'mario';
    childContactPerson = { _id: contactId, type: 'person', parent: { _id: parentId } };
    childPerson = { _id: 'peach', type: 'person' };
    childPlace = { _id: 'happyplace', type: 'mushroom' };
    childPlacePluralLabel = 'mushroompodes';
    childPlaceIcon = 'fa-mushroom';
    doc = { _id: parentId, type: 'star', contact: { _id: contactId} };
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
    stubViewQuery = function(view, docArray) {
      db().query.withArgs(sinon.match(view), sinon.match.any)
        .returns(KarmaUtils.mockPromise(
          null,
          {
            rows: docArray.map(function(doc) { return { doc: doc};})
          }));
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
          get: function() { return { pluralLabel: childPlacePluralLabel, icon: childPlaceIcon }; }
        },
        'DB': db,
        'RulesEngine': {listen: function() {} },
        'Search': KarmaUtils.promiseService(null, []),
        'UserSettings': KarmaUtils.promiseService(null, '')
      });
    };
  }));

  describe('Place', function() {
    var runPlaceTest = function(done, contactArray, assertions) {
      idStateParam = { id: doc._id };
      stubGetQuery(null, doc);
      stubViewQuery('medic-client/contacts_by_parent_name_type', contactArray);
      stubGetVisibleFields(doc.type);
      createController().getSetupPromiseForTesting()
        .then(function() {
          assert(scope.setSelected.called, 'setSelected was called');
          var selected = scope.setSelected.getCall(0).args[0];
          assertions(selected);
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
  });

  describe('Person', function() {
    var runPersonTest = function(done, parentDoc, getParentError, assertions) {
      idStateParam = { id: childContactPerson._id };
      stubGetQuery(null, childContactPerson);
      stubGetQuery(getParentError, parentDoc);
      stubGetVisibleFields(childContactPerson.type);
      createController().getSetupPromiseForTesting()
        .then(function() {
          assert(scope.setSelected.called, 'setSelected was called');
          var selected = scope.setSelected.getCall(0).args[0];
          assertions(selected);
          done();
        }).catch(done);
    };

    it('if primary contact, gets isPrimaryContact flag', function(done) {
      runPersonTest(done, doc, null, function(selected) {
        assert(selected.doc.isPrimaryContact, 'has isPrimaryContact flag');
      });
    });

    it('if no parent field, no isPrimaryContact flag', function(done) {
      delete childContactPerson.parent;
      runPersonTest(done, doc, null, function(selected) {
        assert(!selected.doc.isPrimaryContact, 'no isPrimaryContact flag');
      });
    });

    it('if no parent doc found, no isPrimaryContact flag', function(done) {
      runPersonTest(done, doc, { status: 404 }, function(selected) {
        assert(!selected.doc.isPrimaryContact, 'no isPrimaryContact flag');
      });
    });

  });
});