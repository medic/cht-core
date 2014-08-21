describe('ReportsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      message,
      UserDistrict,
      MarkRead,
      db;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    scope.selected = { _id: 'a' };
    message = { _id: 'x' };
    scope.readStatus = {
      forms: { total: 0, read: 0 },
      messages: { total: 0, read: 0 }
    };
    scope.isRead = function() {
      return true;
    };
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };
    scope.messages = [ message, { _id: 'a' } ];

    UserDistrict = function() {
      return { 
        then: function() {}
      };
    };

    MarkRead = function() {

    };

    db = { 
      changes: function() {}
    };

    createController = function() {
      return $controller('ReportsCtrl', {
        '$scope': scope,
        '$route': { current: { params: { doc: 'x' } } },
        'UserDistrict': UserDistrict,
        'db': db,
        'MarkRead': MarkRead,
        'GenerateSearchQuery': {},
        'Search': {},
        'Verified': {},
        'DeleteMessage': {},
        'UpdateFacility': {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('reports');
    chai.expect(scope.selected).to.equal(message);
  });

});