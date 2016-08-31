var sinon = require('sinon'),
    migrations = require('../../migrations'),
    utils = require('./utils'),
    db = require('../../db');

exports.tearDown = function (callback) {
  utils.restore(db.medic.view, db.medic.insert, migrations.get);
  callback();
};

exports['run does nothing if no migrations'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, []);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['run fails if migration does not have created date'] = function(test) {
  test.expect(1);
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: { migrations: [] } } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, [ { name: 'xyz' } ]);
  migrations.run(function(err) {
    test.equals(err.message, 'Migration "xyz" has no "created" date property');
    test.done();
  });
};

exports['run does nothing if all migrations have run'] = function(test) {
  test.expect(2);
  var meta = { migrations: [ 'xyz' ] };
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: meta } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, [ { name: 'xyz' } ]);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['executes migrations that have not run and updates meta'] = function(test) {
  test.expect(5);
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
  var meta = { _id: 1, migrations: [ 'abc' ], type: 'meta' };
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: meta } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(saveDoc.callCount, 1);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 1,
      migrations: [ 'abc', 'xyz' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['executes multiple migrations that have not run and updates meta each time'] = function(test) {
  test.expect(7);
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
  var getView = sinon.stub(db.medic, 'view');
  getView.onFirstCall().callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ ], type: 'meta' } } ] });
  getView.onSecondCall().callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ ], type: 'meta' } } ] });
  getView.onThirdCall().callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ 'xyz' ], type: 'meta' } } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 3);
    test.equals(saveDoc.callCount, 2);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 1,
      migrations: [ 'xyz' ],
      type: 'meta'
    });
    test.deepEqual(saveDoc.secondCall.args[0], {
      _id: 1,
      migrations: [ 'xyz', 'abc' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['executes multiple migrations in order'] = function(test) {
  test.expect(9);
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
  var getView = sinon.stub(db.medic, 'view');
  getView.onCall(0).callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ ], type: 'meta' } } ] });
  getView.onCall(1).callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ ], type: 'meta' } } ] });
  getView.onCall(2).callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ 'b' ], type: 'meta' } } ] });
  getView.onCall(3).callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ 'b', 'a' ], type: 'meta' } } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 4);
    test.equals(saveDoc.callCount, 3);
    test.deepEqual(saveDoc.firstCall.args[0].migrations, [ 'b' ]);
    test.deepEqual(saveDoc.secondCall.args[0].migrations, [ 'b', 'a' ]);
    test.deepEqual(saveDoc.thirdCall.args[0].migrations, [ 'b', 'a', 'c' ]);
    test.done();
  });
};

exports['executes multiple migrations and stops when one errors'] = function(test) {
  test.expect(6);
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
  var getView = sinon.stub(db.medic, 'view');
  getView.onFirstCall().callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ ], type: 'meta' } } ] });
  getView.onSecondCall().callsArgWith(3, null, { rows: [ { doc: { _id: 1, migrations: [ ], type: 'meta' } } ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, 'Migration "b" failed with: "boom!"');
    test.equals(getView.callCount, 2);
    test.equals(saveDoc.callCount, 1);
    test.deepEqual(saveDoc.firstCall.args[0], {
      _id: 1,
      migrations: [ 'a' ],
      type: 'meta'
    });
    test.done();
  });
};

exports['creates meta if needed'] = function(test) {
  test.expect(5);
  var migration = [
    {
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: function(callback) {
        test.ok(true);
        callback();
      }
    }
  ];
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ ] });
  sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
  var saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  migrations.run(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 2);
    test.equals(saveDoc.callCount, 1);
    test.deepEqual(saveDoc.firstCall.args[0], {
      migrations: [ 'xyz' ],
      type: 'meta'
    });
    test.done();
  });
};
