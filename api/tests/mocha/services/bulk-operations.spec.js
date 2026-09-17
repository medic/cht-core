const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../src/db');
const service = require('../../../src/services/bulk-operations');

describe('Bulk operations service', () => {
  afterEach(() => sinon.restore());

  describe('getLog', () => {
    it('returns the log document without the couch _rev', async () => {
      const doc = {
        _id: 'bulk-operation:abc',
        _rev: '1-xyz',
        start_date: 'date',
        actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
      };
      sinon.stub(db.medicLogs, 'get').resolves(doc);

      const log = await service.getLog('bulk-operation:abc');

      expect(db.medicLogs.get.calledOnceWithExactly('bulk-operation:abc')).to.equal(true);
      expect(log).to.deep.equal({
        _id: 'bulk-operation:abc',
        start_date: 'date',
        actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
      });
      expect(log._rev).to.be.undefined;
    });

    it('returns null when the operation does not exist', async () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });

      const log = await service.getLog('bulk-operation:missing');

      expect(log).to.be.null;
    });

    it('does not query the database for an id that is not a bulk operation', async () => {
      const get = sinon.stub(db.medicLogs, 'get');

      const results = await Promise.all([
        service.getLog(undefined),
        service.getLog(''),
        service.getLog('upgrade_log:something'),
        service.getLog('some-other-doc'),
      ]);

      expect(results).to.deep.equal([null, null, null, null]);
      expect(get.called).to.equal(false);
    });

    it('rethrows errors that are not a 404', async () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 500 });

      try {
        await service.getLog('bulk-operation:boom');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(500);
      }
    });
  });

  describe('queue', () => {
    it('writes a single log doc to medic-logs and returns the operation id', async () => {
      const put = sinon.stub(db.medicLogs, 'put').resolves();

      const id = await service.queue('delete-contact', { contact_id: 'target', delete_users: true });

      expect(put.calledOnce).to.equal(true);
      const log = put.args[0][0];
      expect(log._id).to.equal(id);
      expect(id).to.match(/^bulk-operation:/);
      expect(log).to.deep.include({
        type: 'delete-contact',
        params: { contact_id: 'target', delete_users: true },
        status: 'queued',
      });
      expect(log.start_date).to.be.an.instanceOf(Date);
      expect(log.updated_date).to.deep.equal(log.start_date);
    });

    it('writes nothing else: the actions are Sentinel\'s to plan', async () => {
      sinon.stub(db.medicLogs, 'put').resolves();
      const sentinelPut = sinon.stub(db.sentinel, 'put').resolves();
      const sentinelBulkDocs = sinon.stub(db.sentinel, 'bulkDocs').resolves([]);

      await service.queue('move-contact', { contact_id: 'chp', parent_id: 'hc-b' });

      expect(sentinelPut.called).to.equal(false);
      expect(sentinelBulkDocs.called).to.equal(false);
    });

    it('generates a distinct operation id on each call', async () => {
      sinon.stub(db.medicLogs, 'put').resolves();

      const first = await service.queue('delete-contact', { contact_id: 'a' });
      const second = await service.queue('delete-contact', { contact_id: 'a' });

      expect(first).to.not.equal(second);
    });
  });
});
