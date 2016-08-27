describe('ReportsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      report,
      get,
      post,
      LiveList,
      UserDistrict,
      MarkRead,
      Search,
      Changes,
      FormatDataRecord,
      changesCallback;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    get = sinon.stub();
    post = sinon.stub();
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
    scope.setBackTarget = function() {};
    scope.isMobile = function() {
      return false;
    };
    scope.setTitle = function() {};

    UserDistrict = function() {
      return { 
        then: function() {}
      };
    };

    LiveList = { reports: { initialised: function() { return true; } }};

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

    Search = function(type, filters, options, callback) {
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
        'DeleteDocs': {},
        'UpdateFacility': {},
        'MessageState': {},
        'EditGroup': {},
        'FormatDataRecord': FormatDataRecord,
        'Settings': KarmaUtils.nullPromise(),
        'DB': KarmaUtils.mockDB({ get: get, post: post })(),
        'LiveList': LiveList,
        'SearchFilters': function() {},
        'Export': function() {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
  });

  it('verifies the given report', function() {
    get.returns(KarmaUtils.mockPromise(null, { _id: 'def', name: 'hello' }));
    post.returns(KarmaUtils.mockPromise());
    createController();
    scope.selected[0] = {
      _id: 'abc',
      report: { form: 'P' }
    };
    scope.$broadcast('VerifyReport', null, true);
    setTimeout(function() {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('abc');
      chai.expect(post.callCount).to.equal(1);
      chai.expect(post.args[0][0]._id).to.equal('def');
      chai.expect(post.args[0][0].name).to.equal('hello');
      chai.expect(post.args[0][0].verified).to.equal(true);
    });
  });

});
