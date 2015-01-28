describe('ReportsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      message,
      UserDistrict,
      GenerateSearchQuery,
      MarkRead,
      Search,
      Changes,
      changesCallback;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    scope.selected = { _id: 'a' };
    message = { _id: 'x' };
    scope.readStatus = { forms: 0, messages: 0 };
    scope.updateReadStatus = function() {};
    scope.isRead = function() {
      return true;
    };
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };
    scope.setFilterQuery = function() { };
    scope.messages = [ message, { _id: 'a' } ];

    UserDistrict = function() {
      return { 
        then: function() {}
      };
    };

    MarkRead = function() {};

    GenerateSearchQuery = function() {
      return 'somequery';
    };

    Search = function(options, callback) {
      callback(null, { });
    };

    Changes = function(key, callback) {
      changesCallback = callback;
    };

    changesCallback = undefined;

    createController = function() {
      return $controller('ReportsCtrl', {
        '$scope': scope,
        'UserDistrict': UserDistrict,
        'Changes': Changes,
        'MarkRead': MarkRead,
        'GenerateSearchQuery': GenerateSearchQuery,
        'Search': Search,
        'Verified': {},
        'DeleteMessage': {},
        'UpdateFacility': {},
        'MessageState': {},
        'EditGroup': {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('reports');
  });

  it('updated messages when changed', function() {

    var changedObjects = [ { id: 'a' }, { id: 'b' } ];
    var query = 'myquery';

    scope.messages = [
      {
        _id: 'a',
        _rev: 1,
        shared: 'x',
        existing: 'y'
      }
    ];

    GenerateSearchQuery = function(scope, options, callback) {
      chai.expect(options.changes).to.deep.equal(changedObjects);
      callback(null, query);
    };

    Search = function(options, callback) {
      chai.expect(options.query).to.equal(query);
      callback(null, { results: [ 
        { 
          _id: 'a',
          _rev: 2,
          shared: 'z',
          unique: 'w'
        },
        { 
          _id: 'b'
        }
      ] });
    };
    
    createController();
    changesCallback(changedObjects);
    chai.expect(scope.messages).to.deep.equal([
      { 
        _id: 'a',
        _rev: 2,
        shared: 'z',
        unique: 'w',
        existing: 'y'
      },
      { 
        _id: 'b'
      }
    ]);
  });

  it('updated messages when all deleted', function() {

    var changedObjects = [
      { id: 'a', deleted: true },
      { id: 'b', deleted: true }
    ];

    scope.messages = [
      { _id: 'a' },
      { _id: 'c' }
    ];

    GenerateSearchQuery = function(scope, options, callback) {
      chai.expect(options.changes).to.deep.equal(changedObjects);
      callback(null, 'myquery');
    };

    createController();
    changesCallback(changedObjects);
    chai.expect(scope.messages).to.deep.equal([
      { _id: 'c' }
    ]);
  });

  it('updated messages when some deleted', function() {

    scope.selected = { _id: 'c' };

    var changedObjects = [
      { id: 'a', deleted: true },
      { id: 'b' }
    ];

    scope.messages = [
      { _id: 'a' },
      { _id: 'c' }
    ];

    GenerateSearchQuery = function(scope, options, callback) {
      chai.expect(options.changes).to.deep.equal([{ id: 'b' }]);
      callback(null, 'myquery');
    };

    Search = function(options, callback) {
      callback(null, { results: [
        { _id: 'b' }
      ] });
    };

    createController();
    changesCallback(changedObjects);
    chai.expect(scope.messages).to.deep.equal([
      { _id: 'c' },
      { _id: 'b' }
    ]);
  });

});