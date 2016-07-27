describe('TargetGenerator service', function() {

  'use strict';

  var Settings,
      RulesEngine,
      UserContact,
      injector,
      now = new Date().valueOf();

  beforeEach(function() {
    Settings = sinon.stub();
    UserContact = sinon.stub();
    UserContact.returns(KarmaUtils.mockPromise());
    RulesEngine = {
      listen: sinon.stub(),
    };
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', Settings);
      $provide.value('RulesEngine', RulesEngine);
      $provide.value('UserContact', UserContact);
    });
    inject(function($injector) {
      injector = $injector;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings, RulesEngine);
  });

  it('returns settings errors', function(done) {
    Settings.returns(KarmaUtils.mockPromise('boom'));
    injector.get('TargetGenerator')(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns task generator errors', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [] } } }));
    RulesEngine.listen.callsArgWith(2, 'boom');
    injector.get('TargetGenerator')(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns empty when no targets are emitted', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [] } } }));
    RulesEngine.listen.callsArgWith(2, null, []);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual).to.deep.equal([]);
      done();
    });
  });

  it('ignores unconfigured targets', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'known' }
    ] } } }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'unknown' }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('known');
      done();
    });
  });

  it('calculates the target count', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', date: now, pass: true },
      { _id: '2', type: 'report', date: now, pass: false },
      { _id: '3', type: 'report', date: now, pass: true }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].count).to.equal(2);
      done();
    });
  });

  it('ignores old target instances', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now },
      { _id: '2', type: 'report', pass: true, date: 0 },
      { _id: '2', type: 'report', pass: true } // null date is ignored
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].count).to.equal(1);
      done();
    });
  });

  it('calculates the target percent', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'percent' }
    ] } } }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', date: now, pass: true },
      { _id: '2', type: 'report', date: 0, pass: false },
      { _id: '3', type: 'report', date: now, pass: false },
      { _id: '4', type: 'report', date: now, pass: false }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('percent');
      chai.expect(actual[0].count).to.equal(33);
      done();
    });
  });

  it('handles divison by zero in percent', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'percent' }
    ] } } }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: 0 } // too old to be relevant, so not included in count
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('percent');
      chai.expect(actual[0].count).to.equal(0);
      done();
    });
  });

  it('calculates multiple targets', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' },
      { id: 'registration', type: 'percent' }
    ] } } }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now },
      { _id: '2', type: 'report', pass: true, date: now },
      { _id: '1', type: 'registration', date: now, pass: true },
      { _id: '2', type: 'registration', date: now, pass: false }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(2);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].count).to.equal(2);
      chai.expect(actual[1].id).to.equal('registration');
      chai.expect(actual[1].type).to.equal('percent');
      chai.expect(actual[1].count).to.equal(50);
      done();
    });
  });

  it('deals with deleted instances', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));

    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].count).to.equal(2);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        // Only one counted
        chai.expect(actual[0].count).to.equal(1);
        done();
      } else {
        done(new Error('callback called too many times'));
      }
      callbackCount++;
    });

    // first result from the RulesEngine
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now },
      { _id: '2', type: 'report', pass: true, date: now }
    ]);
    setTimeout(function() {
      // some time later... second result from the RulesEngine : deletion
      RulesEngine.listen.args[0][2](null, [
        { _id: '2', type: 'report', pass: true, date: now, deleted: true }
      ]);
    });
  });

  it('updates for new emissions', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));

    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].count).to.equal(1);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].count).to.equal(2);
        done();
      } else {
        done(new Error('callback called too many times'));
      }
      callbackCount++;
    });

    // first result from the RulesEngine
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now }
    ]);
    setTimeout(function() {
      // some time later... second result from the RulesEngine
      RulesEngine.listen.args[0][2](null, [
        { _id: '2', type: 'report', pass: true, date: now }
      ]);
    });
  });

  it('duplicate instances are updated', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));

    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].count).to.equal(2);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].count).to.equal(3);
        done();
      } else {
        done(new Error('callback called too many times'));
      }
      callbackCount++;
    });

    // first result from the RulesEngine
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now },
      { _id: '1', type: 'report', pass: true, date: now },
      { _id: '2', type: 'report', pass: true, date: now }
    ]);
    setTimeout(function() {
      // some time later... second result from the RulesEngine
      RulesEngine.listen.args[0][2](null, [
        { _id: '1', type: 'report', pass: true, date: now },
        { _id: '2', type: 'report', pass: false, date: now },
        { _id: '3', type: 'report', pass: true, date: now },
        { _id: '4', type: 'report', pass: true, date: now }
      ]);
    });
  });

});
