const chai = require('chai');
const { validate: isUuid } = require('uuid');

const service = require('../src/index');

const expect = chai.expect;

describe('bulk-operations document model', () => {
  describe('constants', () => {
    it('exposes the action types', () => {
      expect(service.ACTIONS).to.deep.equal({
        ARCHIVE: 'archive',
        SET_CONTACT: 'set-contact',
        DELETE_USER: 'delete-user',
      });
    });

    it('exposes the statuses', () => {
      expect(service.STATUSES).to.deep.equal({
        QUEUED: 'queued',
        COMPLETED: 'completed',
        FAILED: 'failed',
      });
    });

    it('exposes the document id prefixes', () => {
      expect(service.LOG_ID_PREFIX).to.equal('bulk-operation:');
      expect(service.ACTION_ID_PREFIX).to.equal('bulk-operation-action:');
    });
  });

  describe('buildBulkOperation', () => {
    const date = new Date('2026-06-29T12:00:00.000Z');

    it('builds a log document with a uuid-v7 operation id', () => {
      const { log } = service.buildBulkOperation([{ action: 'archive', operations: [{ id: 'a' }] }], date);

      expect(log._id.startsWith('bulk-operation:')).to.equal(true);
      expect(isUuid(log._id.slice('bulk-operation:'.length))).to.equal(true);
      expect(log.start_date).to.equal(date);
    });

    it('builds one action document per action type, linked back to the operation', () => {
      const groups = [
        { action: 'archive', operations: [{ id: 'person' }, { id: 'report' }] },
        { action: 'set-contact', operations: [{ id: 'place', current_contact_id: 'person' }] },
        { action: 'delete-user', operations: [{ id: 'org.couchdb.user:chw' }] },
      ];

      const { log, actions } = service.buildBulkOperation(groups, date);

      expect(actions).to.have.length(3);
      actions.forEach((actionDoc, i) => {
        expect(actionDoc._id.startsWith('bulk-operation-action:')).to.equal(true);
        // the action id embeds the operation's uuid, so the two ids stay parseable together
        expect(actionDoc._id).to.include(log._id.slice('bulk-operation:'.length));
        expect(actionDoc.bulk_operation_id).to.equal(log._id);
        expect(actionDoc.action).to.equal(groups[i].action);
        expect(actionDoc.cursor).to.equal(0);
        expect(actionDoc.total).to.equal(groups[i].operations.length);
        expect(service.decodeOperations(actionDoc._attachments.operations)).to.deep.equal(groups[i].operations);
      });
    });

    it('stores the operation params in a base64 json attachment', () => {
      const operations = [{ id: 'place', current_contact_id: 'person' }];
      const { actions } = service.buildBulkOperation([{ action: 'set-contact', operations }], date);

      const attachment = actions[0]._attachments.operations;
      expect(attachment.content_type).to.equal('application/json');
      expect(attachment.data).to.be.a('string');
      expect(service.decodeOperations(attachment)).to.deep.equal(operations);
    });

    it('cross-links each action document to its entry in the log', () => {
      const groups = [
        { action: 'archive', operations: [{ id: 'person' }] },
        { action: 'set-contact', operations: [{ id: 'place' }, { id: 'place2' }] },
      ];

      const { log, actions } = service.buildBulkOperation(groups, date);

      expect(Object.keys(log.actions)).to.deep.equal(actions.map(actionDoc => actionDoc._id));
      actions.forEach((actionDoc) => {
        const logAction = log.actions[actionDoc._id];
        expect(logAction.status).to.equal('queued');
        expect(logAction.action).to.equal(actionDoc.action);
        expect(logAction.updated_date).to.equal(date);
        expect(logAction.total_changes_count).to.equal(actionDoc.total);
      });
    });

    it('generates a distinct operation id on each call', () => {
      const first = service.buildBulkOperation([{ action: 'archive', operations: [] }], date);
      const second = service.buildBulkOperation([{ action: 'archive', operations: [] }], date);

      expect(first.log._id).to.not.equal(second.log._id);
    });
  });
});
