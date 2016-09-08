describe('ContactsContentCtrl', function() {
  'use strict';

  var assert = chai.assert,
    childPerson,
    childPerson2,
    childPlace,
    createController,
    doc,
    scope,
    stubViewQuery;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    var $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = sinon.stub();
    scope.clearSelected = sinon.stub();
    var log = { error: console.error, debug: console.info };

    childPerson = { _id: 'mario', type: 'person' };
    childPerson2 = { _id: 'peach', type: 'person' };
    childPlace = { _id: 'happyplace', type: 'mushroom' };
    doc = { _id: 'districtsdistrict', type: 'star', contact: { _id: 'mario'} };
    var dbGet = sinon.stub();
    var dbQuery = sinon.stub();
    var db = function() {
      return {
          get: dbGet,
          query: dbQuery
         };
    };
    db().get.withArgs(doc._id).returns(KarmaUtils.mockPromise(null, doc));
    stubViewQuery = function(view, docArray) {
      db().query.withArgs(sinon.match(view), sinon.match.any)
        .returns(KarmaUtils.mockPromise(
          null,
          {
            rows: docArray.map(function(doc) { return { doc: doc};})
          }));
    };

    createController = function() {
      return $controller('ContactsContentCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': log,
        '$q': Q,
        '$stateParams': { id: doc._id },
        'Changes': sinon.stub(),
        'ContactSchema': { getVisibleFields: function() { return { 'star' : { fields: [] } }; } },
        'DB': db,
        'RulesEngine': {listen: function() {} },
        'Search': KarmaUtils.promiseService(null, []),
        'UserSettings': KarmaUtils.promiseService(null, '')
      });
    };
  }));

  var runTest = function(done, contactArray, assertions) {
    stubViewQuery('medic-client/contacts_by_parent_name_type', contactArray);
    createController().getSetupPromiseForTesting()
      .then(function() {
        assert(scope.setSelected.called, 'setSelected was called');
        var selected = scope.setSelected.getCall(0).args[0];
        assertions(selected);
        done();
      }).catch(done);
  };

  it('setSelected contact passed in $stateParams', function(done) {
    runTest(done, [childPerson, childPlace], function(selected) {
      assert.equal(scope.setSelected.getCall(0).args[0].doc._id, doc._id);
    });
  });

  it('child places and persons get displayed separately', function(done) {
    runTest(done, [childPerson, childPlace], function(selected) {
        assert.equal(selected.children.persons.length, 1);
        assert.deepEqual(selected.children.persons[0].doc, childPerson);
        assert.equal(selected.children.places.length, 1);
        assert.deepEqual(selected.children.places[0].doc, childPlace);
    });
  });

  it('if no child places, child persons get displayed', function(done) {
    runTest(done, [childPerson, childPerson2], function(selected) {
      assert.equal(selected.children.persons.length, 2);
      assert.equal(selected.children.places, undefined);
    });
  });

  it('if no child persons, child places get displayed', function(done) {
    runTest(done, [childPlace], function(selected) {
      assert.equal(selected.children.persons.length, 0);
      assert.equal(selected.children.places.length, 1);
      assert.deepEqual(selected.children.places[0].doc, childPlace);
    });
  });

  it('contact person gets displayed on top', function(done) {
    runTest(done, [childPerson2, childPerson], function(selected) {
      assert.deepEqual(selected.children.persons[0].doc, childPerson);
    });
  });

  it('if no contact in parent, persons still get displayed', function(done) {
    delete doc.contact;
    runTest(done, [childPerson2, childPerson], function(selected) {
      assert.equal(selected.children.persons.length, 2);
    });
  });

  it('if no contact person in children, persons still get displayed', function(done) {
    runTest(done, [childPerson2], function(selected) {
      assert.equal(selected.children.persons.length, 1);
    });
 });

});