const chai = require('chai');
const sinon = require('sinon');

const db = require('../../../src/db');
const bulkOperations = require('../../../src/services/bulk-operations');
const service = require('../../../src/services/delete-contact');

const expect = chai.expect;

describe('Delete contact service', () => {
  afterEach(() => sinon.restore());

  describe('deleteContactHierarchy', () => {
    it('gathers the hierarchy and queues the bulk operation', () => {
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [
            { id: 'target', value: { shortcode: 'PID-1' } },
            { id: 'child', value: { shortcode: null } },
          ] });
        }
        if (view === 'medic-client/reports_by_subject') {
          return Promise.resolve({ rows: [ { id: 'report-1' }, { id: 'report-1' }, { id: 'report-2' } ] });
        }
        if (view === 'medic/contacts_by_primary_contact') {
          return Promise.resolve({ rows: [
            { id: 'parent-place', key: 'target' }, // parent whose primary is the target -> clear
            { id: 'child', key: 'target' }, // child is itself being deleted -> skip
          ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });
      const queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:xyz');

      return service.deleteContactHierarchy('target', { deleteUsers: true, dryRun: false }).then(result => {
        expect(result).to.deep.equal({
          breakdown: {
            archive: { contacts: 2, reports: 2 },
            'set-contact': 1,
            'delete-user': 1,
          },
          id: 'bulk-operation:xyz',
        });

        // reports matched by uuid + shortcode
        const reportsCall = db.medic.query.getCalls().find(c => c.args[0] === 'medic-client/reports_by_subject');
        expect(reportsCall.args[1].keys).to.deep.equal([ 'target', 'PID-1', 'child' ]);

        // linked users looked up by facility
        expect(db.users.query.args[0][1].keys).to.deep.equal([
          [ 'facility_id', 'target' ],
          [ 'facility_id', 'child' ],
        ]);

        // the queued action lists
        const byAction = Object.fromEntries(queue.args[0][0].map(a => [ a.action, a.operations ]));
        expect(byAction.archive.map(o => o.id)).to.deep.equal([ 'target', 'child', 'report-1', 'report-2' ]);
        expect(byAction['set-contact']).to.deep.equal([ { id: 'parent-place', current_contact_id: 'target' } ]);
        expect(byAction['delete-user']).to.deep.equal([ { id: 'org.couchdb.user:chw' } ]);
      });
    });

    it('throws 404 when the contact does not exist', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [] });

      return service
        .deleteContactHierarchy('missing', {})
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => expect(err.status).to.equal(404));
    });

    it('throws 400 when linked users exist and delete_users is not set', () => {
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [ { id: 'place', value: {} } ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });
      const queue = sinon.stub(bulkOperations, 'queue').resolves('x');

      return service
        .deleteContactHierarchy('place', { deleteUsers: false })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          expect(err.status).to.equal(400);
          expect(queue.called).to.equal(false);
        });
    });

    it('returns the breakdown without queuing for a dry run', () => {
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [ { id: 'place', value: {} } ] });
        }
        if (view === 'medic-client/reports_by_subject') {
          return Promise.resolve({ rows: [ { id: 'r1' } ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [] });
      const queue = sinon.stub(bulkOperations, 'queue').resolves('x');

      return service.deleteContactHierarchy('place', { dryRun: true }).then(result => {
        expect(result).to.deep.equal({
          breakdown: { archive: { contacts: 1, reports: 1 }, 'set-contact': 0, 'delete-user': 0 },
        });
        expect(queue.called).to.equal(false);
      });
    });
  });
});
