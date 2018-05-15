const chai = require('chai'),
      sinon = require('sinon').sandbox.create(),
      migrations = require('../../src/migrations'),
      db = require('../../src/db-nano');

describe('message utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('run fails if migration does not have created date', done => {
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    sinon.stub(migrations, 'get').callsArgWith(0, null, [ { name: 'xyz' } ]);
    migrations.run(err => {
      chai.expect(err.message).to.equal('Migration "xyz" has no "created" date property');
      done();
    });
  });

  it('run does nothing if all migrations have run', done => {
    const log = { migrations: [ 'xyz' ] };
    const getLog = sinon.stub(db.medic, 'get').callsArgWith(1, null, log);
    sinon.stub(migrations, 'get').callsArgWith(0, null, [ { name: 'xyz' } ]);
    migrations.run(err => {
      chai.expect(err).to.equal(null);
      chai.expect(getLog.callCount).to.equal(1);
      chai.expect(getLog.args[0][0]).to.equal('migration-log');
      done();
    });
  });

  it('executes migrations that have not run and updates meta', done => {
    const migration = [
      {
        name: 'xyz',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: callback => {
          callback();
        }
      },
      {
        name: 'abc',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: () => {
          throw new Error('should not be called');
        }
      }
    ];
    const log = { _id: 'migration-log', migrations: [ 'abc' ], type: 'meta' };
    const getLog = sinon.stub(db.medic, 'get').callsArgWith(1, null, log);
    sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
    const saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
    migrations.run(err => {
      chai.expect(err).to.equal(null);
      chai.expect(getLog.callCount).to.equal(2);
      chai.expect(saveDoc.callCount).to.equal(1);
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'abc', 'xyz' ],
        type: 'meta'
      });
      done();
    });
  });

  it('executes multiple migrations that have not run and updates meta each time', done => {
    const migration = [
      {
        name: 'xyz',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: callback => {
          callback();
        }
      },
      {
        name: 'abc',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: callback => {
          callback();
        }
      }
    ];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(2).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'xyz' ] });
    sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
    const saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
    migrations.run(err => {
      chai.expect(err).to.equal(null);
      chai.expect(getLog.callCount).to.equal(3);
      chai.expect(saveDoc.callCount).to.equal(2);
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz' ],
        type: 'meta'
      });
      chai.expect(saveDoc.secondCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz', 'abc' ],
        type: 'meta'
      });
      done();
    });
  });

  it('executes multiple migrations in order', done => {
    const migration = [
      {
        name: 'a',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: callback => {
          callback();
        }
      },
      {
        name: 'b',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: callback => {
          callback();
        }
      },
      {
        name: 'c',
        created: new Date(2015, 1, 1, 3, 0, 0, 0),
        run: callback => {
          callback();
        }
      }
    ];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(2).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'b' ] });
    getLog.onCall(3).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'b', 'a' ] });
    sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
    const saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
    migrations.run(err => {
      chai.expect(err).to.equal(null);
      chai.expect(getLog.callCount).to.equal(4);
      chai.expect(saveDoc.callCount).to.equal(3);
      chai.expect(saveDoc.args[0][0].migrations).to.deep.equal([ 'b' ]);
      chai.expect(saveDoc.args[1][0].migrations).to.deep.equal([ 'b', 'a' ]);
      chai.expect(saveDoc.args[2][0].migrations).to.deep.equal([ 'b', 'a', 'c' ]);
      done();
    });
  });

  it('executes multiple migrations and stops when one errors', done => {
    const migration = [
      {
        name: 'a',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: callback => {
          callback();
        }
      },
      {
        name: 'b',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: callback => {
          callback('boom!');
        }
      },
      {
        name: 'c',
        created: new Date(2015, 1, 1, 3, 0, 0, 0),
        run: () => {
          throw new Error('should not be called');
        }
      }
    ];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ ] });
    sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
    const saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
    migrations.run(err => {
      chai.expect(err).to.equal('boom!');
      chai.expect(getLog.callCount).to.equal(2);
      chai.expect(saveDoc.callCount).to.equal(1);
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'a' ],
        type: 'meta'
      });
      done();
    });
  });

  it('creates log if needed', done => {
    const migration = [{
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: callback => {
        callback();
      }
    }];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).callsArgWith(1, { statusCode: 404 });
    getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [] });
    getLog.onCall(2).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [] });
    const getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ ] });
    sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
    const saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
    migrations.run(err => {
      chai.expect(err).to.equal(null);
      chai.expect(getView.callCount).to.equal(1);
      chai.expect(saveDoc.callCount).to.equal(2);
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ ],
        type: 'meta'
      });
      chai.expect(saveDoc.secondCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz' ],
        type: 'meta'
      });
      done();
    });
  });

  it('migrates meta to log', done => {
    const migration = [{
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: () => {
        throw new Error('should not be called!');
      }
    }];
    const oldLog = { _id: 1, type: 'meta', migrations: [ 'xyz' ] };
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).callsArgWith(1, { statusCode: 404 });
    getLog.onCall(1).callsArgWith(1, null, { _id: 'migration-log', type: 'meta', migrations: [ 'xyz' ] });
    const getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [ { doc: oldLog } ] });
    sinon.stub(migrations, 'get').callsArgWith(0, null, migration);
    const saveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
    migrations.run(err => {
      chai.expect(err).to.equal(null);
      chai.expect(getView.callCount).to.equal(1);
      chai.expect(saveDoc.callCount).to.equal(2);
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz' ],
        type: 'meta'
      });
      chai.expect(saveDoc.secondCall.args[0]).to.deep.equal({
        _id: 1,
        migrations: [ 'xyz' ],
        type: 'meta',
        _deleted: true
      });
      done();
    });
  });

});
