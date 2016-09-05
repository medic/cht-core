describe('ContactsContentCtrl', function() {
  'use strict';

  var assert = chai.assert,
    createController,
    id,
    scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    var $rootScope = _$rootScope_;
    scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = sinon.stub();
    scope.clearSelected = sinon.stub();
    id = 'abcde';
    var contact = { _id: id, type: 'mushroom' };
    var log = { error: console.error, debug: console.info };
    createController = function() {
      return $controller('ContactsContentCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': log,
        '$q': Q,
        '$stateParams': { id: id },
        'Changes': sinon.stub(),
        'ContactSchema': { getVisibleFields: function() { return { 'mushroom' : { fields: [] } }; } },
        'DB': function() { return {
          get: KarmaUtils.promiseService(null, contact),
          query: KarmaUtils.promiseService(null, { rows: [] })
         }; },
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
        assert.equal(scope.setSelected.getCall(0).args[0].doc._id, id);
        done();
      }).catch(done);
  });

});