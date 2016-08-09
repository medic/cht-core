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
    RulesEngine = {
      listen: sinon.stub(),
    };
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', Settings);
      $provide.value('RulesEngine', RulesEngine);
      $provide.value('UserContact', UserContact);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function($injector) {
      injector = $injector;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings, RulesEngine, UserContact);
  });

  it('returns settings errors', function(done) {
    Settings.returns(KarmaUtils.mockPromise('boom'));
    UserContact.returns(KarmaUtils.mockPromise());
    injector.get('TargetGenerator')(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns empty array when no targets are configured', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    UserContact.returns(KarmaUtils.mockPromise());
    RulesEngine.listen.callsArgWith(2, null, []);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual).to.deep.equal([]);
      done();
    });
  });

  it('returns task generator errors', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [] } } }));
    UserContact.returns(KarmaUtils.mockPromise());
    RulesEngine.listen.callsArgWith(2, 'boom');
    injector.get('TargetGenerator')(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns empty when no targets are emitted', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [] } } }));
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    UserContact.returns(KarmaUtils.mockPromise());
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
    }, 1);
  });

  it('updates for new emissions', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(KarmaUtils.mockPromise());
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
    }, 1);
  });

  it('duplicate instances are updated', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(KarmaUtils.mockPromise());
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
    }, 1);
  });

  it('excludes targets for which the expression fails', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { tasks: { targets: { items: [
      { id: 'none',  type: 'count' },
      { id: 'true',  type: 'count', context: 'userContact.name === "geoff"' },
      { id: 'false', type: 'count', context: 'userContact.name === "jeff"' }
    ] } } }));
    UserContact.returns(KarmaUtils.mockPromise(null, { name: 'geoff' }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'none', date: now, pass: true },
      { _id: '2', type: 'true', date: now, pass: true },
      { _id: '3', type: 'false', date: now, pass: true }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(2);
      chai.expect(actual[0].id).to.equal('none');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].count).to.equal(1);
      chai.expect(actual[1].id).to.equal('true');
      chai.expect(actual[1].type).to.equal('count');
      chai.expect(actual[1].count).to.equal(1);
      done();
    });
  });

});
