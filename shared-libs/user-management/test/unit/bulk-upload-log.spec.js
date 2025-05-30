const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

let bulkUploadLog;
let db;

describe('bulk-upload-log', () => {
  let clock;
  beforeEach(() => {
    db = {
      medicLogs: {
        get: sinon.stub(),
        put: sinon.stub()
      }
    };
    clock = sinon.useFakeTimers(1000);
    bulkUploadLog = rewire('../../src/bulk-upload-log');
    bulkUploadLog.__set__('db', db);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('createLog', () => {
    it('should create new log for user', async () => {
      db.medicLogs.put.resolves({ ok: true, id: 'bulk-auser-upload-1000', rev: '1-123' });

      const logId = await bulkUploadLog.createLog({ name: 'username' }, 'auser');
      expect(logId).to.deep.equal('bulk-auser-upload-1000');
      expect(db.medicLogs.get.callCount).to.equal(0);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0][0]).to.deep.equal({
        _id: 'bulk-auser-upload-1000',
        bulk_uploaded_by: 'username',
        bulk_uploaded_on: new Date().toISOString(),
        progress: {
          status: 'initiated'
        },
        data: {}
      });
    }); 
    
    it('should throw an error on db fail', async () => {
      db.medicLogs.put.rejects(new Error('boom'));
      await expect(bulkUploadLog.createLog({ name: 'username' }, 'auser')).to.be.rejectedWith('boom');
    }); 
  });

  describe('updateLog', () => {
    it('should do nothing when no id is provided', async () => {
      await bulkUploadLog.updateLog(undefined, { some: 'progress' }, 'data');
      expect(db.medicLogs.get.callCount).to.equal(0);
      expect(db.medicLogs.put.callCount).to.equal(0);
    }); 
    
    it('should ignore non-existent logs', async () => {
      db.medicLogs.get.rejects({ status: 404 });
      await bulkUploadLog.updateLog('123', { some: 'progress' }, 'data');

      expect(db.medicLogs.get.calledOnceWithExactly('123')).to.equal(true);
      expect(db.medicLogs.put.callCount).to.equal(0);
    }); 
    
    it('should throw db errors', async () => {
      db.medicLogs.get.rejects(new Error('boom'));
      await expect(bulkUploadLog.updateLog('123', { name: 'username' }, 'data')).to.be.rejectedWith('boom');
    }); 
    
    it('should update log', async () => {
      db.medicLogs.get.resolves({
        _id: 'bulk-user-upload-1000',
        _rev: '1-123',
        bulk_uploaded_by: 'username',
        bulk_uploaded_on: new Date().toISOString(),
        progress: {
          status: 'initiated'
        },
        data: {}
      });

      await bulkUploadLog.updateLog('bulk-user-upload-1000', { some: 'progress' }, { this: 'data' });

      expect(db.medicLogs.get.calledOnceWithExactly('bulk-user-upload-1000')).to.equal(true);
      expect(db.medicLogs.put.callCount).to.equal(1);
      expect(db.medicLogs.put.args[0][0]).to.deep.equal({
        _id: 'bulk-user-upload-1000',
        _rev: '1-123',
        bulk_uploaded_by: 'username',
        bulk_uploaded_on: new Date().toISOString(),
        progress: {
          status: 'initiated',
          some: 'progress'
        },
        data: { this: 'data' }
      });
    });
  });
});
