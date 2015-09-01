describe('TasksCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      TaskGenerator,
      Changes,
      $rootScope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    scope = $rootScope.$new();

    scope.setSelectedModule = function() {};
    scope.filterModel = {};
    scope.setSelected = function() {};

    TaskGenerator = sinon.stub();
    Changes = sinon.stub();

    createController = function() {
      return $controller('TasksCtrl', {
        '$scope': scope,
        'TaskGenerator': TaskGenerator,
        'Changes': Changes
      });
    };
  }));

  it('set up controller', function(done) {
    TaskGenerator.returns(KarmaUtils.mockPromise(null, [ { id: 1, resolved: false } ]));
    createController();
    $rootScope.$digest();
    setTimeout(function() {
      chai.expect(TaskGenerator.callCount).to.equal(1);
      chai.expect(Changes.callCount).to.equal(1);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.tasks).to.deep.equal([ { id: 1, resolved: false } ]);
      chai.expect(scope.error).to.equal(false);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });

  it('shows task generator errors', function(done) {
    TaskGenerator.returns(KarmaUtils.mockPromise('boom'));
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
      { id: 1, resolved: false },
      { id: 2, resolved: false }
    ];
    TaskGenerator
      .onFirstCall().returns(KarmaUtils.mockPromise(null, [ { id: 1, resolved: false } ]))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, expected));
    createController();
    Changes.args[0][0].callback();
    $rootScope.$digest();
    setTimeout(function() {
      chai.expect(TaskGenerator.callCount).to.equal(2);
      chai.expect(scope.filterModel.type).to.equal('tasks');
      chai.expect(scope.tasks).to.deep.equal(expected);
      chai.expect(scope.error).to.equal(false);
      chai.expect(scope.loading).to.equal(false);
      done();
    });
  });
});