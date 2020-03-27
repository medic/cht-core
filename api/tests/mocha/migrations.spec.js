const chai = require('chai');
const sinon = require('sinon');
const migrations = require('../../src/migrations');
const db = require('../../src/db');

describe('migrations', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('run fails if migration does not have created date', () => {
    sinon.stub(db.medic, 'get').resolves({});
    sinon.stub(migrations, 'get').resolves([ { name: 'xyz' } ]);
    return migrations.run().catch(err => {
      chai.expect(err.message).to.equal('Migration "xyz" has no "created" date property');
    });
  });

  it('run does nothing if all migrations have run', () => {
    const log = { migrations: [ 'xyz' ] };
    const getLog = sinon.stub(db.medic, 'get').resolves(log);
    sinon.stub(migrations, 'get').resolves([ { name: 'xyz' } ]);
    return migrations.run().then(() => {
      chai.expect(getLog.callCount).to.equal(1);
      chai.expect(getLog.args[0][0]).to.equal('migration-log');
    });
  });

  it('executes migrations that have not run and updates meta', () => {
    const migration = [
      {
        name: 'xyz',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: () => Promise.resolve()
      },
      {
        name: 'abc',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: () => Promise.reject(new Error('should not be called'))
      }
    ];
    const log = { _id: 'migration-log', migrations: [ 'abc' ], type: 'meta' };
    const getLog = sinon.stub(db.medic, 'get').resolves(log);
    sinon.stub(migrations, 'get').resolves(migration);
    const put = sinon.stub(db.medic, 'put').resolves({});
    return migrations.run().then(() => {
      chai.expect(getLog.callCount).to.equal(2);
      chai.expect(put.callCount).to.equal(1);
      chai.expect(put.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'abc', 'xyz' ],
        type: 'meta'
      });
    });
  });

  it('executes multiple migrations that have not run and updates meta each time', () => {
    const migration = [
      {
        name: 'xyz',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: () => Promise.resolve()
      },
      {
        name: 'abc',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: () => Promise.resolve()
      }
    ];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).resolves({ _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(1).resolves({ _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(2).resolves({ _id: 'migration-log', type: 'meta', migrations: [ 'xyz' ] });
    sinon.stub(migrations, 'get').resolves(migration);
    const put = sinon.stub(db.medic, 'put').resolves({});
    return migrations.run().then(() => {
      chai.expect(getLog.callCount).to.equal(3);
      chai.expect(put.callCount).to.equal(2);
      chai.expect(put.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz' ],
        type: 'meta'
      });
      chai.expect(put.secondCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz', 'abc' ],
        type: 'meta'
      });
    });
  });

  it('executes multiple migrations in order', () => {
    const migration = [
      {
        name: 'a',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: () => Promise.resolve()
      },
      {
        name: 'b',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: () => Promise.resolve()
      },
      {
        name: 'c',
        created: new Date(2015, 1, 1, 3, 0, 0, 0),
        run: () => Promise.resolve()
      }
    ];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).resolves({ _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(1).resolves({ _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(2).resolves({ _id: 'migration-log', type: 'meta', migrations: [ 'b' ] });
    getLog.onCall(3).resolves({ _id: 'migration-log', type: 'meta', migrations: [ 'b', 'a' ] });
    sinon.stub(migrations, 'get').resolves(migration);
    const put = sinon.stub(db.medic, 'put').resolves({});
    return migrations.run().then(() => {
      chai.expect(getLog.callCount).to.equal(4);
      chai.expect(put.callCount).to.equal(3);
      chai.expect(put.args[0][0].migrations).to.deep.equal([ 'b' ]);
      chai.expect(put.args[1][0].migrations).to.deep.equal([ 'b', 'a' ]);
      chai.expect(put.args[2][0].migrations).to.deep.equal([ 'b', 'a', 'c' ]);
    });
  });

  it('executes multiple migrations and stops when one errors', () => {
    const migration = [
      {
        name: 'a',
        created: new Date(2015, 1, 1, 1, 0, 0, 0),
        run: () => Promise.resolve()
      },
      {
        name: 'b',
        created: new Date(2015, 1, 1, 2, 0, 0, 0),
        run: () => Promise.reject('boom!')
      },
      {
        name: 'c',
        created: new Date(2015, 1, 1, 3, 0, 0, 0),
        run: () => Promise.reject(new Error('should not be called'))
      }
    ];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).resolves({ _id: 'migration-log', type: 'meta', migrations: [ ] });
    getLog.onCall(1).resolves({ _id: 'migration-log', type: 'meta', migrations: [ ] });
    sinon.stub(migrations, 'get').resolves(migration);
    const put = sinon.stub(db.medic, 'put').resolves({});
    return migrations.run().catch(err => {
      chai.expect(err).to.equal('boom!');
      chai.expect(getLog.callCount).to.equal(2);
      chai.expect(put.callCount).to.equal(1);
      chai.expect(put.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'a' ],
        type: 'meta'
      });
    });
  });

  it('creates log if needed', () => {
    const migration = [{
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: () => Promise.resolve()
    }];
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).returns(Promise.reject({ status: 404 }));
    getLog.onCall(1).resolves({ _id: 'migration-log', type: 'meta', migrations: [] });
    getLog.onCall(2).resolves({ _id: 'migration-log', type: 'meta', migrations: [] });
    const query = sinon.stub(db.medic, 'query').resolves({ rows: [ ] });
    sinon.stub(migrations, 'get').resolves(migration);
    const put = sinon.stub(db.medic, 'put').resolves({});
    return migrations.run().then(() => {
      chai.expect(query.callCount).to.equal(1);
      chai.expect(put.callCount).to.equal(2);
      chai.expect(put.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ ],
        type: 'meta'
      });
      chai.expect(put.secondCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz' ],
        type: 'meta'
      });
    });
  });

  it('migrates meta to log', () => {
    const migration = [{
      name: 'xyz',
      created: new Date(2015, 1, 1, 1, 0, 0, 0),
      run: () => Promise.reject(new Error('should not be called!'))
    }];
    const oldLog = { _id: 1, type: 'meta', migrations: [ 'xyz' ] };
    const getLog = sinon.stub(db.medic, 'get');
    getLog.onCall(0).returns(Promise.reject({ status: 404 }));
    getLog.onCall(1).resolves({ _id: 'migration-log', type: 'meta', migrations: [ 'xyz' ] });
    const query = sinon.stub(db.medic, 'query').resolves({ rows: [ { doc: oldLog } ] });
    sinon.stub(migrations, 'get').resolves(migration);
    const put = sinon.stub(db.medic, 'put').resolves({});
    return migrations.run().then(() => {
      chai.expect(query.callCount).to.equal(1);
      chai.expect(put.callCount).to.equal(2);
      chai.expect(put.firstCall.args[0]).to.deep.equal({
        _id: 'migration-log',
        migrations: [ 'xyz' ],
        type: 'meta'
      });
      chai.expect(put.secondCall.args[0]).to.deep.equal({
        _id: 1,
        migrations: [ 'xyz' ],
        type: 'meta',
        _deleted: true
      });
    });
  });

});
