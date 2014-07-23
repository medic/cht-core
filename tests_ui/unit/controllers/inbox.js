describe('InboxCtrl controller', function() {

  'use strict';

  var createController,
      scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = {
      date: {
        to: '',
        from: ''
      }
    };
    scope.selectedMessage = 'a';
    scope.selectMessage = function(msg) {
      scope.selectedMessage = msg;
    };

    createController = function() {
      return $controller('InboxCtrl', {
        '$scope': scope
      });
    };
  }));

  it('set up controller', function() {
    createController();
    scope.init({ district: 'columbia' });
    chai.expect(scope.userDistrict).to.equal('columbia');
  });

});