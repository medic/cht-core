describe('TasksCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      TaskGenerator,
      timeout;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller, $timeout) {
    scope = $rootScope.$new();
    timeout = $timeout;

    scope.setSelectedModule = function() {};
    scope.setTasks = function(tasks) {
      scope.items = tasks || [];
    };
    scope.filterModel = {};
    scope.setSelected = function() {};

    TaskGenerator = sinon.stub();

    createController = function() {
      return $controller('TasksCtrl', {
        '$scope': scope,
        'TaskGenerator': TaskGenerator
      });
    };
  }));

  it('set up controller', function(done) {
    TaskGenerator.returns(KarmaUtils.mockPromise(null, [ { id: 1 } ]));
    createController();
    setTimeout(function() {
      timeout.flush();
      chai.expect(TaskGenerator.callCount).to.equal(1);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.items).to.deep.equal([ { id: 1 } ]);
      chai.expect(scope.error).to.equal(false);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });

  it('shows task generator errors', function(done) {
    TaskGenerator.returns(KarmaUtils.mockPromise('boom'));
    createController();
    setTimeout(function() {
      chai.expect(TaskGenerator.callCount).to.equal(1);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.items).to.deep.equal([]);
      chai.expect(scope.error).to.equal(true);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });
});