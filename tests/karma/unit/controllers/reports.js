describe('ReportsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      report,
      UserDistrict,
      MarkRead,
      Search,
      Changes,
      FormatDataRecord,
      changesCallback;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    report = { _id: 'x' };
    scope.readStatus = { forms: 0, messages: 0 };
    scope.updateReadStatus = function() {};
    scope.isRead = function() {
      return true;
    };
    scope.setFilterQuery = function() {};
    scope.reports = [ report, { _id: 'a' } ];
    scope.clearSelected = function() {};
    scope.showBackButton = function() {};

    UserDistrict = function() {
      return { 
        then: function() {}
      };
    };

    MarkRead = function() {};

    FormatDataRecord = function(data) {
      return {
        then: function(cb) {
          cb(data);
          return {
            catch: function() {}
          };
        }
      };
    };

    Search = function($scope, options, callback) {
      callback(null, { });
    };

    Changes = function(options) {
      changesCallback = options.callback;
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
        'EditGroup': {},
        'FormatDataRecord': FormatDataRecord,
        'Settings': {},
        'DB': {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('reports');
  });

  it('updated reports when changed', function() {

    Search = function($scope, options, callback) {
      chai.expect(options.silent).to.equal(true);
      callback(null, [
        {
          _id: 'a',
          _rev: 2,
          shared: 'z',
          unique: 'w'
        },
        {
          _id: 'b'
        }
      ]);
    };
    
    createController();

    scope.selected = { _id: 'a' };
    scope.reports = [
      {
        _id: 'a',
        _rev: 1,
        shared: 'x',
        existing: 'y'
      }
    ];
    changesCallback({ id: 'a' });

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

});
