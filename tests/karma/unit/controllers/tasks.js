describe('TasksCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      TaskGenerator,
      $rootScope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();

    scope.setSelectedModule = function() {};
    scope.filterModel = {};
    scope.setSelected = function() {};
    scope.clearSelected = function() {};
    scope.setTitle = function() {};

    TaskGenerator = sinon.stub();

    createController = function() {
      return $controller('TasksCtrl', {
        '$scope': scope,
        'TaskGenerator': TaskGenerator,
        '$timeout': function(cb) {
          cb();
        }
      });
    };
  }));

  it('set up controller', function(done) {
    var expected = [ { _id: 1, resolved: false } ];
    TaskGenerator.callsArgWith(1, null, expected);
    createController();
    $rootScope.$digest();
    setTimeout(function() {
      chai.expect(TaskGenerator.callCount).to.equal(1);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.tasks).to.deep.equal(expected);
      chai.expect(scope.error).to.equal(false);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });

  it('shows task generator errors', function(done) {
    TaskGenerator.callsArgWith(1, 'boom');
    createController();
    $rootScope.$digest();
    setTimeout(function() {
      chai.expect(TaskGenerator.callCount).to.equal(1);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.tasks).to.deep.equal([]);
      chai.expect(scope.error).to.equal(true);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });

  it('generates tasks when changes received', function(done) {
    var expected = [
      { _id: 1, resolved: false },
      { _id: 2, resolved: false }
    ];
    TaskGenerator.callsArgWith(1, null, [ { _id: 1, resolved: false } ]);
    createController();
    $rootScope.$digest();
    setTimeout(function() {
      TaskGenerator.args[0][1](null, expected);
      chai.expect(TaskGenerator.callCount).to.equal(1);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.tasks).to.deep.equal(expected);
      chai.expect(scope.error).to.equal(false);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });
});
