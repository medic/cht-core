describe('AnalyticsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      moduleId,
      fetch;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    fetch = sinon.stub();
    scope = $rootScope.$new();
    scope.filterModel = { };
    scope.setSelectedModule = function (module) {
      scope.filterModel.module = module;
    };
    scope.clearSelected = function() {};
    scope.fetchAnalyticsModules = fetch;
    createController = function() {
      return $controller('AnalyticsCtrl', {
        '$scope': scope,
        '$stateParams': { },
        '$state': { current: { name: 'anc' } }
      });
    };
    moduleId = undefined;
  }));

  afterEach(function() {
    KarmaUtils.restore(fetch);
  });

  it('set up controller with no modules', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, []));
    createController();
    scope.$digest();
    setTimeout(function() {
      chai.expect(scope.filterModel.type).to.equal('analytics');
      chai.expect(scope.filterModel.module).to.equal(undefined);
      done();
    });
  });

  it('renders first module', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'stock' }
    ]));
    createController();
    scope.$digest();
    setTimeout(function() {
      chai.expect(scope.filterModel.type).to.equal('analytics');
      chai.expect(scope.filterModel.module.state).to.equal('stock');
      done();
    });
  });

  it('renders specified module', function(done) {
    moduleId = 'anc';
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'stock' },
      { state: 'anc' }
    ]));
    createController();
    scope.$digest();
    setTimeout(function() {
      chai.expect(scope.filterModel.type).to.equal('analytics');
      chai.expect(scope.filterModel.module.state).to.equal('anc');
      done();
    });
  });

});