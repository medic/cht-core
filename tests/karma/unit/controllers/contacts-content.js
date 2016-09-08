describe('ContactsContentCtrl', function() {
  'use strict';

  var assert = chai.assert,
    childPerson,
    childPlace,
    createController,
    doc,
    scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    var $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = sinon.stub();
    scope.clearSelected = sinon.stub();
    var log = { error: console.error, debug: console.info };

    childPerson = { _id: 'mario', type: 'person' };
    childPlace = { _id: 'luigi', type: 'mushroom' };
    doc = { _id: 'districtsdistrict', type: 'star' };
    var dbGet = sinon.stub();
    var dbQuery = sinon.stub();
    var db = function() {
      return {
          get: dbGet,
          query: dbQuery
         };
    };
    db().get.withArgs(doc._id).returns(KarmaUtils.mockPromise(null, doc));
    var stubViewQuery = function(view, docArray) {
      db().query.withArgs(sinon.match(view), sinon.match.any)
        .returns(KarmaUtils.mockPromise(
          null,
          {
            rows: docArray.map(function(doc) { return { doc: doc};})
          }));
    };
    stubViewQuery('medic-client/places_by_contact', [childPerson]);
    stubViewQuery('medic-client/contacts_by_parent_name_type', [childPerson, childPlace]);

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

  it('setSelected contact passed in $stateParams', function(done) {
    createController().getSetupPromiseForTesting()
      .then(function() {
        assert(scope.setSelected.called, 'setSelected was called');
        assert.equal(scope.setSelected.getCall(0).args[0].doc._id, doc._id);
        done();
      }).catch(done);
  });

  it('child places and persons get displayed', function(done) {
    createController().getSetupPromiseForTesting()
      .then(function() {
        assert(scope.setSelected.called, 'setSelected was called');
        var selected = scope.setSelected.getCall(0).args[0];
        assert.equal(selected.children.persons.length, 1);
        assert.deepEqual(selected.children.persons[0].doc, childPerson);
        assert.equal(selected.children.places.length, 1);
        assert.deepEqual(selected.children.places[0].doc, childPlace);
        done();
      }).catch(done);
  });

});