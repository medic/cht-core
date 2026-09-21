const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));
const { expect } = chai;

const { Qualifier } = require('@medic/cht-datasource');

const db = require('../../src/libs/db');
const dataContext = require('../../src/libs/data-context');
const { ValidationError } = require('../../src/errors');
const { validate, plan } = require('../../src/delete-contact');

describe('delete-contact planner', () => {
  let medicQuery;
  let usersQuery;
  let contactGet;

  beforeEach(() => {
    medicQuery = sinon.stub().resolves({ rows: [] });
    usersQuery = sinon.stub().resolves({ rows: [] });
    contactGet = sinon.stub().resolves({ _id: 'place', type: 'clinic' });
    db.init({ medic: { query: medicQuery }, users: { query: usersQuery } });
    dataContext.init({ bind: () => contactGet });
  });

  afterEach(() => sinon.restore());

  const stubViews = ({ contacts = [], reports = [], primaryContacts = [] }) => {
    medicQuery.callsFake((view) => {
      if (view === 'medic/contacts_by_depth') {
        return Promise.resolve({ rows: contacts });
      }
      if (view === 'medic-client/reports_by_subject') {
        return Promise.resolve({ rows: reports });
      }
      if (view === 'medic/contacts_by_primary_contact') {
        return Promise.resolve({ rows: primaryContacts });
      }
      return Promise.resolve({ rows: [] });
    });
  };

  describe('plan', () => {
    it('gathers the hierarchy and returns the actions in execution order', async () => {
      stubViews({
        contacts: [
          { id: 'target', value: { shortcode: 'PID-1' } },
          { id: 'child', value: { shortcode: null } },
        ],
        reports: [ { id: 'report-1' }, { id: 'report-1' }, { id: 'report-2' } ],
        primaryContacts: [
          { id: 'parent-place', key: 'target' }, // parent whose primary is the target -> clear
          { id: 'child', key: 'target' }, // child is itself being deleted -> skip
        ],
      });
      usersQuery.resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });

      const { summary, actions } = await plan({ contact_id: 'target', delete_users: true });

      // reports matched by uuid + shortcode
      const reportsCall = medicQuery.getCalls().find(c => c.args[0] === 'medic-client/reports_by_subject');
      expect(reportsCall.args[1].keys).to.deep.equal([ 'target', 'PID-1', 'child' ]);

      // users looked up by both facility_id and contact_id
      expect(usersQuery.args[0][1].keys).to.deep.equal([
        [ 'facility_id', 'target' ], [ 'contact_id', 'target' ],
        [ 'facility_id', 'child' ], [ 'contact_id', 'child' ],
      ]);

      // set-contact, delete-user, then delete (reports before their subject contacts)
      expect(actions.map(a => a.action)).to.deep.equal([ 'set-contact', 'delete-user', 'delete' ]);
      const byAction = Object.fromEntries(actions.map(a => [ a.action, a.operations ]));
      expect(byAction['set-contact']).to.deep.equal([ { id: 'parent-place', current_contact_id: 'target' } ]);
      expect(byAction['delete-user']).to.deep.equal([ { id: 'org.couchdb.user:chw' } ]);
      expect(byAction.delete.map(o => o.id)).to.deep.equal([ 'report-1', 'report-2', 'target', 'child' ]);

      expect(summary).to.deep.equal({
        delete: { contacts: 2, reports: 2 },
        'set-contact': { places: 1 },
        'delete-user': 1,
      });
    });

    it('leaves the linked users alone when delete_users was not set', async () => {
      stubViews({ contacts: [ { id: 'place', value: {} } ] });
      usersQuery.resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });

      const { summary, actions } = await plan({ contact_id: 'place' });

      const byAction = Object.fromEntries(actions.map(a => [ a.action, a.operations ]));
      expect(byAction['delete-user']).to.deep.equal([]);
      expect(summary['delete-user']).to.equal(0);
      expect(usersQuery.called).to.equal(false);
    });
  });

  describe('validate', () => {
    it('refuses a delete that would strand linked users', async () => {
      stubViews({ contacts: [ { id: 'place', value: {} } ] });
      usersQuery.resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });

      const err = await validate({ contact_id: 'place' }).catch(e => e);

      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.contain('1 user(s) are linked to contacts');
    });

    it('allows the delete when the linked users are going too', async () => {
      stubViews({ contacts: [ { id: 'place', value: {} } ] });
      usersQuery.resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });

      await expect(validate({ contact_id: 'place', delete_users: true })).to.be.fulfilled;
      // nothing to check when the users are being removed anyway
      expect(usersQuery.called).to.equal(false);
    });

    it('allows the delete when no users are linked', async () => {
      stubViews({ contacts: [ { id: 'place', value: {} } ] });

      await expect(validate({ contact_id: 'place' })).to.be.fulfilled;
      expect(contactGet.args[0]).to.deep.equal([ Qualifier.byUuid('place') ]);
    });

    it('refuses a contact that no longer exists', async () => {
      contactGet.resolves(null);

      const err = await validate({ contact_id: 'place', delete_users: true }).catch(e => e);

      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.equal(`contact 'place' not found`);
      expect(usersQuery.called).to.equal(false);
    });
  });
});
