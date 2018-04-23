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
    Settings.returns(Promise.reject('boom'));
    UserContact.returns(Promise.resolve());
    injector.get('TargetGenerator')(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns empty array when no targets are configured', function(done) {
    Settings.returns(Promise.resolve({}));
    UserContact.returns(Promise.resolve());
    RulesEngine.listen.callsArgWith(2, null, []);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual).to.deep.equal([]);
      done();
    });
  });

  it('returns task generator errors', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [] } } }));
    UserContact.returns(Promise.resolve());
    RulesEngine.listen.callsArgWith(2, 'boom');
    injector.get('TargetGenerator')(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns empty when no targets are emitted', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [] } } }));
    UserContact.returns(Promise.resolve());
    RulesEngine.listen.callsArgWith(2, null, []);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual).to.deep.equal([]);
      done();
    });
  });

  it('ignores unconfigured targets', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'known' }
    ] } } }));
    UserContact.returns(Promise.resolve());
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
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', date: now, pass: true },
      { _id: '2', type: 'report', date: now, pass: false },
      { _id: '3', type: 'report', date: now, pass: true }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].value.pass).to.equal(2);
      done();
    });
  });

  it('ignores old target instances', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now },
      { _id: '2', type: 'report', pass: true, date: 0 },
      { _id: '2', type: 'report', pass: true } // null date is ignored
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(1);
      chai.expect(actual[0].id).to.equal('report');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].value.pass).to.equal(1);
      done();
    });
  });

  it('calculates the target percent', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'percent' }
    ] } } }));
    UserContact.returns(Promise.resolve());
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
      chai.expect(actual[0].value.pass).to.equal(1);
      chai.expect(actual[0].value.total).to.equal(3);
      chai.expect(actual[0].value.percent).to.equal(33);
      done();
    });
  });

  it('defaults targets to zero with no reports', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'target-1', type: 'percent' },
      { id: 'target-2', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    RulesEngine.listen.callsArgWith(2, null, []);

    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(2);

      chai.expect(actual[0].id).to.equal('target-1');
      chai.expect(actual[0].type).to.equal('percent');
      chai.expect(actual[0].value.pass).to.equal(0);
      chai.expect(actual[0].value.total).to.equal(0);
      chai.expect(actual[0].value.percent).to.equal(0);

      chai.expect(actual[1].id).to.equal('target-2');
      chai.expect(actual[1].type).to.equal('count');
      chai.expect(actual[1].value.pass).to.equal(0);
      chai.expect(actual[1].value.total).to.equal(0);
      done();
    });
  });

  it('calculates multiple targets', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' },
      { id: 'registration', type: 'percent' }
    ] } } }));
    UserContact.returns(Promise.resolve());
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
      chai.expect(actual[0].value.pass).to.equal(2);
      chai.expect(actual[1].id).to.equal('registration');
      chai.expect(actual[1].type).to.equal('percent');
      chai.expect(actual[1].value.pass).to.equal(1);
      chai.expect(actual[1].value.total).to.equal(2);
      chai.expect(actual[1].value.percent).to.equal(50);
      done();
    });
  });

  // loop waiting for rules engine listener to be registered
  var getListener = function(callback) {
    var interval;
    var count = 0;
    interval = setInterval(function() {
      if (RulesEngine.listen.args[0]) {
        clearInterval(interval);
        callback(RulesEngine.listen.args[0][2]);
      }
      if (count++ >= 1000) {
        // stop looping and wait for test to timeout
        clearInterval(interval);
      }
    }, 1);
  };

  it('deals with deleted instances', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(2);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        // Only one counted
        chai.expect(actual[0].value.pass).to.equal(1);
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
    getListener(function(listener) {
      // some time later... second result from the RulesEngine : deletion
      listener(null, [
        { _id: '2', type: 'report', pass: true, date: now, deleted: true }
      ]);
    });
  });

  it('updates for new emissions', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(1);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(2);
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
    getListener(function(listener) {
      // some time later... second result from the RulesEngine
      listener(null, [
        { _id: '2', type: 'report', pass: true, date: now }
      ]);
    });
  });

  it('duplicate instances are updated', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(2);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(3);
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
    getListener(function(listener) {
      // some time later... second result from the RulesEngine
      listener(null, [
        { _id: '1', type: 'report', pass: true, date: now },
        { _id: '2', type: 'report', pass: false, date: now },
        { _id: '3', type: 'report', pass: true, date: now },
        { _id: '4', type: 'report', pass: true, date: now }
      ]);
    });
  });

  it('excludes targets for which the expression fails', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'none',  type: 'count' },
      { id: 'true',  type: 'count', context: 'user.name === "geoff"' },
      { id: 'false', type: 'count', context: 'user.name === "jeff"' }
    ] } } }));
    UserContact.returns(Promise.resolve({ name: 'geoff' }));
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'none', date: now, pass: true },
      { _id: '2', type: 'true', date: now, pass: true },
      { _id: '3', type: 'false', date: now, pass: true }
    ]);
    injector.get('TargetGenerator')(function(err, actual) {
      chai.expect(actual.length).to.equal(2);
      chai.expect(actual[0].id).to.equal('none');
      chai.expect(actual[0].type).to.equal('count');
      chai.expect(actual[0].value.pass).to.equal(1);
      chai.expect(actual[1].id).to.equal('true');
      chai.expect(actual[1].type).to.equal('count');
      chai.expect(actual[1].value.pass).to.equal(1);
      done();
    });
  });

  it('updates targets that are no longer relevant - #3207', function(done) {
    Settings.returns(Promise.resolve({ tasks: { targets: { items: [
      { id: 'report', type: 'count' }
    ] } } }));
    UserContact.returns(Promise.resolve());
    var callbackCount = 0;
    injector.get('TargetGenerator')(function(err, actual) {
      if (callbackCount === 0) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(1);
      } else if (callbackCount === 1) {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].id).to.equal('report');
        chai.expect(actual[0].type).to.equal('count');
        chai.expect(actual[0].value.pass).to.equal(0);
        done();
      } else {
        done('callback called too many times');
      }
      callbackCount++;
    });

    // first result from the RulesEngine
    RulesEngine.listen.callsArgWith(2, null, [
      { _id: '1', type: 'report', pass: true, date: now }
    ]);
    getListener(function(listener) {
      // some time later... second result from the RulesEngine updates
      // the date to no longer be relevant this month
      listener(null, [
        { _id: '1', type: 'report', pass: true, date: 1000 }
      ]);
    });
  });

});
