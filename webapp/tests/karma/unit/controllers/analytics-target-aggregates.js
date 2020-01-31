describe('AnalyticsTargetAggregatesCtrl Controller', () => {
  'use strict';

  let createController;
  let TargetAggregates;
  let $rootScope;
  let scope;
  let stateGo;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    TargetAggregates = {
      isEnabled: sinon.stub(),
      getAggregates: sinon.stub()
    };
    scope = $rootScope.$new();
    createController = function() {
      return $controller('AnalyticsTargetAggregatesCtrl', {
        '$scope': scope,
        '$state': { go: stateGo },
        'TargetAggregates': TargetAggregates,
      });
    };
  }));

  afterEach(function() {
    sinon.restore();
  });

  const testAfterTimeout = (done, tests) => {
    setTimeout(() => {
      // wrapping in try/catch cause chai throws an error when an assertion fails
      // if we don't catch it and pass it to done, the displayed error would be something like:
      // Error: Timeout of 2000ms exceeded. For async tests and hooks, ensure "done()" is called
      try {
        tests();
        done();
      } catch(err) {
        done(err);
      }
    });
  };

  it('should instantiate correctly', () => {
    TargetAggregates.isEnabled.resolves(false);
    const ctrl = createController();
    chai.expect(ctrl.loading).to.equal(true);
    chai.expect(ctrl.error).to.equal(null);
    chai.expect(ctrl.aggregates).to.deep.equal(null);
    chai.expect(ctrl.aggregatesDisabled).to.equal(false);
  });

  it('should set correct loading and error when TargetAggregates fails', done => {
    TargetAggregates.isEnabled.rejects({ some: 'err' });
    const ctrl = createController();

    testAfterTimeout(done, () => {
      chai.expect(TargetAggregates.isEnabled.callCount).to.equal(1);
      chai.expect(TargetAggregates.getAggregates.callCount).to.equal(0);
      chai.expect(ctrl.loading).to.equal(false);
      chai.expect(ctrl.error).to.deep.equal({ some: 'err' });
      chai.expect(ctrl.aggregates).to.deep.equal(null);
      chai.expect(ctrl.aggregatesDisabled).to.equal(false);
    });
  });

  it('should set aggregatesDisabled', (done) => {
    TargetAggregates.isEnabled.resolves(false);
    const ctrl = createController();

    testAfterTimeout(done, () => {
      chai.expect(TargetAggregates.isEnabled.callCount).to.equal(1);
      chai.expect(TargetAggregates.getAggregates.callCount).to.equal(0);
      chai.expect(ctrl.loading).to.equal(false);
      chai.expect(ctrl.error).to.equal(null);
      chai.expect(ctrl.aggregatesDisabled).to.equal(true);
      chai.expect(ctrl.aggregates).to.equal(undefined);
    });
  });

  it('should set aggregates', (done) => {
    TargetAggregates.isEnabled.resolves(true);
    TargetAggregates.getAggregates.resolves(['some aggregates']);
    const ctrl = createController();

    testAfterTimeout(done, () => {
      chai.expect(TargetAggregates.isEnabled.callCount).to.equal(1);
      chai.expect(TargetAggregates.getAggregates.callCount).to.equal(1);
      chai.expect(ctrl.loading).to.equal(false);
      chai.expect(ctrl.error).to.equal(null);
      chai.expect(ctrl.aggregatesDisabled).to.equal(false);
      chai.expect(ctrl.aggregates).to.deep.equal(['some aggregates']);
    });
  });

  it('should redirect to correct state', () => {
    TargetAggregates.isEnabled.resolves(true);
    TargetAggregates.getAggregates.resolves(['some aggregates']);
    stateGo = sinon.stub();

    const ctrl = createController();
    ctrl.targetDetails('targetId');
    chai.expect(stateGo.callCount).to.equal(1);
    chai.expect(stateGo.args[0]).to.deep.equal(['analytics.target-aggregates.detail', { id: 'targetId' }]);
  });
});
