describe('AnalyticsTargetsCtrl controller', function() {

  'use strict';

  let createController;

  let rulesEngine;
  let $rootScope;
  let telemetry;
  let scope;

  beforeEach(() => {
    module('inboxApp');
  });

  beforeEach(inject(function(_$rootScope_, $controller) {
    $rootScope = _$rootScope_;
    rulesEngine = {
      isEnabled: sinon.stub(),
      fetchTargets: sinon.stub(),
    };
    telemetry = { record: sinon.stub() };

    scope = $rootScope.$new();

    createController = () => {
      return $controller('AnalyticsTargetsCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        'RulesEngine': rulesEngine,
        'Telemetry': telemetry,
      });
    };
  }));

  afterEach(function() {
    sinon.restore();
  });

  const testWithTimeout = (done, cb) => {
    setTimeout(() => {
      try {
        cb();
        done();
      } catch(err) {
        done(err);
      }
    });
  };

  it('set up controller when rules engine is not enabled', done => {
    rulesEngine.isEnabled.resolves(false);
    const ctrl = createController();
    testWithTimeout(done, () => {
      chai.expect(rulesEngine.isEnabled.callCount).to.equal(1);
      chai.expect(rulesEngine.fetchTargets.callCount).to.equal(0);
      chai.expect(ctrl.targets).to.deep.equal([]);
      chai.expect(ctrl.loading).to.equal(false);
      chai.expect(ctrl.targetsDisabled).to.equal(true);
      chai.expect(telemetry.record.callCount).to.equal(1);
      chai.expect(telemetry.record.args[0][0]).to.equal('analytics:targets:load');
    });
  });

  it('should fetches targets when rules engine is enabled', done => {
    rulesEngine.isEnabled.resolves(true);
    rulesEngine.fetchTargets.resolves([{ id: 'target1' }, { id: 'target2' }]);
    const ctrl = createController();
    testWithTimeout(done, () => {
      chai.expect(rulesEngine.isEnabled.callCount).to.equal(1);
      chai.expect(rulesEngine.fetchTargets.callCount).to.equal(1);
      chai.expect(ctrl.targets).to.deep.equal([{ id: 'target1' }, { id: 'target2' }]);
      chai.expect(ctrl.loading).to.equal(false);
      chai.expect(ctrl.targetsDisabled).to.equal(false);
      chai.expect(telemetry.record.callCount).to.equal(1);
      chai.expect(telemetry.record.args[0][0]).to.equal('analytics:targets:load');
    });
  });

  it('should filter targets to visible ones', done => {
    rulesEngine.isEnabled.resolves(true);
    const targets = [
      { id: 'target1' },
      { id: 'target1', visible: true },
      { id: 'target1', visible: undefined },
      { id: 'target1', visible: false },
      { id: 'target1', visible: 'something' },
    ];
    rulesEngine.fetchTargets.resolves(targets);
    const ctrl = createController();
    testWithTimeout(done, () => {
      chai.expect(rulesEngine.isEnabled.callCount).to.equal(1);
      chai.expect(rulesEngine.fetchTargets.callCount).to.equal(1);
      chai.expect(ctrl.targets).to.deep.equal([
        { id: 'target1' },
        { id: 'target1', visible: true },
        { id: 'target1', visible: undefined },
        { id: 'target1', visible: 'something' },
      ]);
      chai.expect(ctrl.loading).to.equal(false);
    });
  });

  it('should catch rules engine errors', done => {
    rulesEngine.isEnabled.rejects({ some: 'err' });
    const ctrl = createController();
    testWithTimeout(done, () => {
      chai.expect(rulesEngine.isEnabled.callCount).to.equal(1);
      chai.expect(rulesEngine.fetchTargets.callCount).to.equal(0);
      chai.expect(ctrl.targets).to.deep.equal([]);
      chai.expect(ctrl.loading).to.equal(false);
      chai.expect(ctrl.targetsDisabled).to.equal(false);
    });
  });
});
