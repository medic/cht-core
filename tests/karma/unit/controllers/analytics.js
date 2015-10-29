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
        '$stateParams': { module: moduleId }
      });
    };
    moduleId = undefined;
  }));

  afterEach(function() {
    KarmaUtils.restore(fetch);
  });

  it('set up controller with no modules', function() {
    fetch.returns(KarmaUtils.mockPromise(null, []));
    createController();
    chai.expect(scope.filterModel.type).to.equal('analytics');
    chai.expect(scope.filterModel.module).to.equal(undefined);
  });

  it('renders first module', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      {
        id: 'anc',
        render: function() {
          chai.expect(scope.filterModel.type).to.equal('analytics');
          chai.expect(scope.filterModel.module.id).to.equal('anc');
          done();
        }
      },
      { 
        id: 'stock'
      }
    ]));
    createController();
  });

  it('renders specified module', function(done) {
    moduleId = 'anc';
    fetch.returns(KarmaUtils.mockPromise(null, [
      { 
        id: 'stock'
      },
      {
        id: 'anc',
        render: function() {
          chai.expect(scope.filterModel.type).to.equal('analytics');
          chai.expect(scope.filterModel.module.id).to.equal('anc');
          done();
        }
      }
    ]));
    createController();
  });

});