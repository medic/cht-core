describe('ReportsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      report,
      UserDistrict,
      MarkRead,
      Search,
      Changes,
      changesCallback;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    scope.selected = { _id: 'a' };
    report = { _id: 'x' };
    scope.readStatus = { forms: 0, messages: 0 };
    scope.updateReadStatus = function() {};
    scope.isRead = function() {
      return true;
    };
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };
    scope.setFilterQuery = function() { };
    scope.reports = [ report, { _id: 'a' } ];

    UserDistrict = function() {
      return { 
        then: function() {}
      };
    };

    MarkRead = function() {};

    Search = function($scope, options, callback) {
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
        'Search': Search,
        'Verified': {},
        'DeleteDoc': {},
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

  it('updated reports when changed', function() {

    var changedObjects = [ { id: 'a' }, { id: 'b' } ];

    scope.reports = [
      {
        _id: 'a',
        _rev: 1,
        shared: 'x',
        existing: 'y'
      }
    ];

    Search = function($scope, options, callback) {
      chai.expect(options.silent).to.equal(true);
      chai.expect(options.changes).to.deep.equal(changedObjects);
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
    chai.expect(scope.reports).to.deep.equal([
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

  it('updated reports when all deleted', function() {

    var changedObjects = [
      { id: 'a', deleted: true },
      { id: 'b', deleted: true }
    ];

    scope.reports = [
      { _id: 'a' },
      { _id: 'c' }
    ];

    createController();
    changesCallback(changedObjects);
    chai.expect(scope.reports).to.deep.equal([
      { _id: 'c' }
    ]);
  });

  it('updated reports when some deleted', function() {

    scope.selected = { _id: 'c' };

    var changedObjects = [
      { id: 'a', deleted: true },
      { id: 'b' }
    ];

    scope.reports = [
      { _id: 'a' },
      { _id: 'c' }
    ];

    Search = function($scope, options, callback) {
      chai.expect(options.silent).to.equal(true);
      chai.expect(options.changes).to.deep.equal([{ id: 'b' }]);
      callback(null, { results: [
        { _id: 'b' }
      ] });
    };

    createController();
    changesCallback(changedObjects);
    chai.expect(scope.reports).to.deep.equal([
      { _id: 'c' },
      { _id: 'b' }
    ]);
  });

});