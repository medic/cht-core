describe('AnalyticsCtrl controller', function() {

  'use strict';

  var createController,
      fetch,
      $rootScope,
      scope,
      stateGo,
      stateReload;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    fetch = sinon.stub();
    stateGo = sinon.stub();
    stateReload = sinon.stub();
    scope = $rootScope.$new();
    scope.filterModel = { };
    scope.setSelectedModule = function (module) {
      scope.filterModel.module = module;
    };
    scope.clearSelected = function() {};
    scope.fetchAnalyticsModules = fetch;
    createController = function(startState) {
      return $controller('AnalyticsCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope,
          '$stateParams': { },
          '$state': { current: { name: startState }, go: stateGo, reload: stateReload }
        });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore(fetch, stateGo, stateReload);
  });

  it('set up controller with no modules', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, []));
    createController('anc');
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
    createController('anc');
    scope.$digest();
    setTimeout(function() {
      chai.expect(scope.filterModel.type).to.equal('analytics');
      chai.expect(scope.filterModel.module.state).to.equal('stock');
      done();
    });
  });

  it('renders specified module', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'stock' },
      { state: 'anc' }
    ]));
    createController('anc');
    scope.$digest();
    setTimeout(function() {
      chai.expect(scope.filterModel.type).to.equal('analytics');
      chai.expect(scope.filterModel.module.state).to.equal('anc');
      done();
    });
  });

  it('jumps to child state if single module present', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'anc' }
    ]));
    createController('analytics');
    scope.$digest();
    setTimeout(function() {
      chai.expect(stateGo.callCount).to.equal(1);
      chai.expect(stateGo.calledWith('anc')).to.equal(true);
      done();
    });
  });

  it('does not jump to child state if multiple modules present', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'stock' },
      { state: 'anc' }
    ]));
    createController('analytics');
    scope.$digest();
    setTimeout(function() {
      chai.expect(stateGo.callCount).to.equal(0);
      done();
    });
  });

  it('sets up force-reload if single module present', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'analytics.anc' }
    ]));
    createController('analytics');
    scope.$digest();
    setTimeout(function() {
      chai.expect($rootScope.$$listeners.$stateChangeStart.length).to.equal(1);
      done();
    });
  });

  it('does not set up force-reload if multiple modules present', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'stock' },
      { state: 'analytics.anc' }
    ]));
    createController('analytics');
    scope.$digest();
    setTimeout(function() {
      chai.expect(!!$rootScope.$$listeners.$stateChangeStart).to.equal(false);
      done();
    });
  });

  it('force-reload only reloads for child->parent transition', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'analytics.anc' }
    ]));
    createController('analytics');
    scope.$digest();
    setTimeout(function() {
      chai.expect($rootScope.$$listeners.$stateChangeStart.length).to.equal(1);
      var shouldReload = $rootScope.$$listeners.$stateChangeStart[0];

      testReload(shouldReload, /* to */ 'analytics', /* from */ 'analytics.anc', true);
      testReload(shouldReload, 'analytics.anc', 'analytics', false);
      testReload(shouldReload, 'contacts', 'analytics.anc', false);
      testReload(shouldReload, 'contacts', 'analytics', false);
      testReload(shouldReload, 'analytics', 'contacts', false);
      testReload(shouldReload, 'analytics.anc', 'contacts', false);

      done();
    });
  });

  var testReload = function(reloadFunc, toStateName, fromStateName, wasCalled) {
      var preventDefault = sinon.stub(),
        toState = {name: toStateName},
        fromState = {name: fromStateName};
      reloadFunc({preventDefault: preventDefault}, toState, {}, fromState, {});
      chai.expect(preventDefault.called).to.equal(wasCalled);
      chai.expect(stateReload.calledWith(toStateName)).to.equal(wasCalled);
      KarmaUtils.restore(stateReload);
  };

  it('only sets up force-reload once', function(done) {
    fetch.returns(KarmaUtils.mockPromise(null, [
      { state: 'analytics.anc' }
    ]));
    createController('analytics');
    scope.$digest();
    setTimeout(function() {
      chai.expect($rootScope.$$listeners.$stateChangeStart.length).to.equal(1);

      // Simulate navigating back to analytics (create another controller on same rootscope).
      createController('analytics');
      scope.$digest();
      setTimeout(function() {
        chai.expect($rootScope.$$listeners.$stateChangeStart.length).to.equal(1);
        done();
      });
    });
  });

});

