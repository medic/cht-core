describe('AnalyticsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      modules,
      moduleId,
      AnalyticsModules,
      Settings;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = { };
    scope.setSelectedModule = function (module) {
      scope.filterModel.module = module;
    };
    scope.analyticsModules = undefined;
    scope.setAnalyticsModules = function (modules) {
      scope.analyticsModules = modules;
    };
    scope.clearSelected = function() {};
    createController = function() {
      return $controller('AnalyticsCtrl', {
        '$scope': scope,
        '$stateParams': { module: moduleId },
        'Settings': Settings,
        'AnalyticsModules': AnalyticsModules
      });
    };
    modules = [];
    moduleId = undefined;
    AnalyticsModules = function() {
      return modules;
    };
    Settings = function(callback) {
      callback(null, {});
    };
  }));

  it('set up controller with no modules', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('analytics');
    chai.expect(scope.filterModel.module).to.equal(undefined);
  });

  it('renders first module', function(done) {
    modules = [
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
    ];
    createController();
  });

  it('renders specified module', function(done) {
    moduleId = 'anc';
    modules = [
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
    ];
    createController();
  });

});