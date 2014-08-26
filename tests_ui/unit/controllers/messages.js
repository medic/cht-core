describe('MessagesCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      UserDistrict,
      Changes;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = {};
    scope.selected = { id: 'a' };
    scope.permissions = { admin: true };
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };

    UserDistrict = function(callback) {
      callback();
    };

    Changes = function() { };

    createController = function() {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        '$route': { current: { params: { doc: 'x' } } },
        'Changes': Changes,
        'MarkAllRead': {},
        'UserDistrict': UserDistrict
      });
    };
  }));

  it('set up controller', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('messages');
    chai.expect(scope.selected.id).to.equal('x');
  });

});