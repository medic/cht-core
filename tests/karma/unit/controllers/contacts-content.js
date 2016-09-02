describe('ContactsContentCtrl', function() {
  'use strict';

  var createController;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    var $rootScope = _$rootScope_;
    var scope = $rootScope.$new();
    scope.setLoadingContent = sinon.stub();
    createController = function() {
      return $controller('ContactsContentCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        '$log': sinon.stub(),
        '$q': Q,
        '$stateParams': { id: 'abcde' },
        'Changes': sinon.stub(),
        'ContactSchema': sinon.stub,
        'DB': function() { return {
          get: KarmaUtils.promiseService(null, ''),
          query: KarmaUtils.promiseService(null, '')
         }; },
        'RulesEngine': {listen: function() {} },
        'Search': sinon.stub(),
        'UserSettings': KarmaUtils.promiseService(null, '')
      });
    };
  }));

  afterEach(function() {
  });

  it('creates the controller', function() {
    createController();
  });

});