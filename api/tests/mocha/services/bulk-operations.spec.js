const chai = require('chai');
const sinon = require('sinon');

const db = require('../../../src/db');
const service = require('../../../src/services/bulk-operations');

describe('Bulk operations service', () => {
  afterEach(() => sinon.restore());

  describe('getLog', () => {
    it('returns the log document without the couch _rev', () => {
      const doc = {
        _id: 'bulk-operation:abc',
        _rev: '1-xyz',
        start_date: 'date',
        actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
      };
      sinon.stub(db.medicLogs, 'get').resolves(doc);

      return service.getLog('bulk-operation:abc').then((log) => {
        chai.expect(db.medicLogs.get.calledOnceWithExactly('bulk-operation:abc')).to.equal(true);
        chai.expect(log).to.deep.equal({
          _id: 'bulk-operation:abc',
          start_date: 'date',
          actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
        });
        chai.expect(log._rev).to.equal(undefined);
      });
    });

    it('returns null when the operation does not exist', () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });

      return service.getLog('bulk-operation:missing').then((log) => {
        chai.expect(log).to.equal(null);
      });
    });

    it('does not query the database for an id that is not a bulk operation', () => {
      const get = sinon.stub(db.medicLogs, 'get');

      return Promise
        .all([
          service.getLog(undefined),
          service.getLog(''),
          service.getLog('upgrade_log:something'),
          service.getLog('some-other-doc'),
        ])
        .then((results) => {
          chai.expect(results).to.deep.equal([null, null, null, null]);
          chai.expect(get.called).to.equal(false);
        });
    });

    it('rethrows errors that are not a 404', () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 500 });

      return service
        .getLog('bulk-operation:boom')
        .then(() => chai.expect.fail('should have thrown'))
        .catch((err) => chai.expect(err.status).to.equal(500));
    });
  });
});
