var sinon = require('sinon'),
    migrations = require('../../migrations'),
    utils = require('./utils'),
    db = require('../../db');

exports.tearDown = function (callback) {
  utils.restore(db.medic.view, db.medic.get, db.medic.insert, migrations.get);
  callback();
};

exports['run fails if migration does not have created date'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
  sinon.stub(migrations, 'get').callsArgWith(0, null, [ { name: 'xyz' } ]);
  migrations.run(function(err) {
    test.equals(err.message, 'Migration "xyz" has no "created" date property');
    test.done();
  });
};

exports['run does nothing if all migrations have run'] = function(test) {
  var log = { migrations: [ 'xyz' ] };
  var getLog = sinon.stub(db.medic, 'get').callsArgWith(1, null, log);
  sinon.stub(migrations, 'get').callsArgWith(0, null, [ { name: 'xyz' } ]);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getLog.callCount, 1);
    test.equals(getLog.args[0][0], 'migration-log');
    test.done();
  });
};

exports['executes migrations that have not run and updates meta'] = function(test) {
  var migration = [
    {
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    },
    {
      name: 'abc',
      created: new Date(2015, 1, 1, 2, 0, 0, 0),
      run: function(callback) {
        test.ok(false);
        callback();
      }
    }
  ];
  var log = { _id: 'migration-log', migrations: [ 'abc' ], type: 'meta' };
  var getLog = sinon.stub(db.medic, 'get').callsArgWith(1, null, log);
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getLog.callCount, 2);
    test.equals(saveDoc.callCount, 1);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 'migration-log',
      migrations: [ 'abc', 'xyz' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['executes multiple migrations that have not run and updates meta each time'] = function(test) {
  var migration = [
    {
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    },
    {
      name: 'abc',
      created: new Date(2015, 1, 1, 2, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    }
  ];
  var getLog = sinon.stub(db.medic, 'get');
  getLog.onCall(0).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
  getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
  getLog.onCall(2).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'xyz' ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getLog.callCount, 3);
    test.equals(saveDoc.callCount, 2);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 'migration-log',
      migrations: [ 'xyz' ],
      type: 'meta'
    });
    test.deepEqual(saveDoc.secondCall.args[0], {
      _id: 'migration-log',
      migrations: [ 'xyz', 'abc' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['executes multiple migrations in order'] = function(test) {
  var migration = [
    {
      name: 'a',
      created: new Date(2015, 1, 1, 2, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    },
    {
      name: 'b',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    },
    {
      name: 'c',
      created: new Date(2015, 1, 1, 3, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    }
  ];
  var getLog = sinon.stub(db.medic, 'get');
  getLog.onCall(0).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
  getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
  getLog.onCall(2).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'b' ] });
  getLog.onCall(3).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'b', 'a' ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getLog.callCount, 4);
    test.equals(saveDoc.callCount, 3);
    test.deepEqual(saveDoc.args[0][0].migrations, [ 'b' ]);
    test.deepEqual(saveDoc.args[1][0].migrations, [ 'b', 'a' ]);
    test.deepEqual(saveDoc.args[2][0].migrations, [ 'b', 'a', 'c' ]);
    test.done();
  });
};

exports['executes multiple migrations and stops when one errors'] = function(test) {
  var migration = [
    {
      name: 'a',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    },
    {
      name: 'b',
      created: new Date(2015, 1, 1, 2, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback('boom!');
      }
    },
    {
      name: 'c',
      created: new Date(2015, 1, 1, 3, 0, 0, 0),
      run: function(callback) {
        test.ok(false);
        callback();
      }
    }
  ];
  var getLog = sinon.stub(db.medic, 'get');
  getLog.onCall(0).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
  getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, 'Migration "b" failed with: "boom!"');
    test.equals(getLog.callCount, 2);
    test.equals(saveDoc.callCount, 1);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 'migration-log',
      migrations: [ 'a' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['creates log if needed'] = function(test) {
  test.expect(6);
  var migration = [{
    name: 'xyz',
    created: new Date(2015, 1, 1, 1, 0, 0, 0),
    run: function(callback) {
      test.ok(true);
      callback();
    }
  }];
  var getLog = sinon.stub(db.medic, 'get');
  getLog.onCall(0).callsArgWith(1, { statusCode: 404 });
  getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [] });
  getLog.onCall(2).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [] });
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(saveDoc.callCount, 2);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 'migration-log',
      migrations: [ ],
      type: 'meta'
    });
    test.deepEqual(saveDoc.secondCall.args[0], {
      _id: 'migration-log',
      migrations: [ 'xyz' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['migrates meta to log'] = function(test) {
  test.expect(5);
  var migration = [{
    name: 'xyz',
    created: new Date(2015, 1, 1, 1, 0, 0, 0),
    run: function() {
      throw new Error('should not be called!');
    }
  }];
  var oldLog = { _id: 1, type: 'meta', migrations: [ 'xyz' ] };
  var getLog = sinon.stub(db.medic, 'get');
  getLog.onCall(0).callsArgWith(1, { statusCode: 404 });
  getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'xyz' ] });
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: oldLog } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(saveDoc.callCount, 2);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 'migration-log',
      migrations: [ 'xyz' ],
      type: 'meta'
    });
    test.deepEqual(saveDoc.secondCall.args[0], {
      _id: 1,
      migrations: [ 'xyz' ],
      type: 'meta',
      _deleted: true
    });
    test.done();
  });
};
