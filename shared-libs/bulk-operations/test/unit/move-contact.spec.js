const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));
const { expect } = chai;
const { Qualifier } = require('@medic/cht-datasource');
const request = require('@medic/couch-request');
const nouveau = require('@medic/nouveau');

const db = require('../../src/libs/db');
const lineage = require('../../src/libs/lineage');
const dataContext = require('../../src/libs/data-context');
const constraints = require('../../src/lineage-constraints');
const { ValidationError } = require('../../src/errors');
const { validate, plan } = require('../../src/move-contact');

// The destination, whose own minified lineage becomes the replacement for everything that moves.
const healthCenterB = { _id: 'hc-b', type: 'health_center', parent: { _id: 'district' } };
// The subtree being moved: a clinic under hc-a, with one person inside it.
const clinic = { _id: 'clinic-1', type: 'clinic', parent: { _id: 'hc-a', parent: { _id: 'district' } } };

// The lineage every moved contact ends up under.
const UNDER_HC_B = { _id: 'hc-b', parent: { _id: 'district' } };

// contacts_by_depth answers two questions here, told apart by which key form the query uses.
const subtreeOf = sinon.match(opts => Array.isArray(opts.key));
const atDepthOne = sinon.match(opts => Array.isArray(opts.keys));

// One nouveau index carries both the report and its author, so a single matcher covers it.
const reportQuery = sinon.match(opts => opts.uri.endsWith('docs_by_replication_key'));

const PARAMS = { contact_id: 'clinic-1', parent_id: 'hc-b' };

describe('move-contact planner', () => {
  let contactGet;
  let query;
  let reports;

  beforeEach(() => {
    contactGet = sinon.stub();
    contactGet.withArgs(Qualifier.byUuid('clinic-1')).resolves(clinic);
    contactGet.withArgs(Qualifier.byUuid('hc-b')).resolves(healthCenterB);

    query = sinon.stub();
    query.withArgs('medic/contacts_by_depth', subtreeOf)
      .resolves({ rows: [ { id: 'clinic-1' }, { id: 'person-1' } ] });
    // The person sits under the clinic. The clinic's own parent is outside the subtree, so the view
    // never emits a row for it and it has to come off the source document instead.
    query.withArgs('medic/contacts_by_depth', atDepthOne)
      .resolves({ rows: [ { id: 'person-1', key: [ 'clinic-1', 1 ] } ] });
    query.withArgs('medic/contacts_by_primary_contact').resolves({ rows: [] });

    db.init({ medic: { query } });
    lineage.init(require('@medic/lineage')(Promise, db.medic));
    dataContext.init({ bind: () => contactGet });
    sinon.stub(constraints, 'assertMoveIsLegal').resolves();

    sinon.stub(request, 'post');
    reports = request.post.withArgs(reportQuery).resolves({ hits: [] });
  });

  afterEach(() => sinon.restore());

  describe('plan', () => {
    it('returns both actions, with the source parent replaced and the descendant rewritten', async () => {
      const { summary, actions } = await plan(PARAMS);

      expect(actions.map(a => a.action)).to.deep.equal([ 'set-parent', 'set-contact' ]);
      // The source's parent is replaced outright; the descendant keeps the clinic and gains the new
      // chain above it.
      expect(actions[0].operations).to.deep.equal([
        { id: 'clinic-1', current_parent_id: 'hc-a', parent: UNDER_HC_B },
        { id: 'person-1', current_parent_id: 'clinic-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
      ]);
      expect(summary).to.deep.equal({ 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } });
    });

    it('answers everything from indexes without reading a single document', async () => {
      const allDocs = sinon.stub().resolves({ rows: [] });
      db.init({ medic: { query, allDocs } });
      reports.resolves({ hits: [ { id: 'report-1', fields: { submitter: 'person-1' } } ] });

      await plan(PARAMS);

      expect(allDocs.called).to.equal(false);
    });

    it('asks the view for the parents in one query, keyed at depth one', async () => {
      await plan(PARAMS);

      const parentCalls = query.args
        .filter(([ view, opts ]) => view === 'medic/contacts_by_depth' && opts.keys);
      expect(parentCalls).to.have.lengthOf(1);
      expect(parentCalls[0][1].keys).to.deep.equal([ [ 'clinic-1', 1 ], [ 'person-1', 1 ] ]);
    });

    it('takes the source own parent from the document, which the view cannot report', async () => {
      // The view is keyed on the subtree and the source's parent sits outside it, so nothing comes back.
      query.withArgs('medic/contacts_by_depth', atDepthOne).resolves({ rows: [] });

      const { actions } = await plan(PARAMS);

      expect(actions[0].operations[0])
        .to.deep.equal({ id: 'clinic-1', current_parent_id: 'hc-a', parent: UNDER_HC_B });
    });

    it('fetches the contacts through cht-datasource', async () => {
      await plan(PARAMS);

      expect(contactGet.args).to.deep.include([ Qualifier.byUuid('hc-b') ]);
      expect(contactGet.args).to.deep.include([ Qualifier.byUuid('clinic-1') ]);
    });

    it('refreshes the cached lineage on reports the moved contacts authored', async () => {
      reports.resolves({ hits: [ { id: 'report-1', fields: { submitter: 'person-1' } } ] });

      const { summary, actions } = await plan(PARAMS);

      expect(actions[1].operations).to.deep.equal([ {
        id: 'report-1',
        current_contact_id: 'person-1',
        contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
      } ]);
      expect(summary['set-contact']).to.deep.equal({ reports: 1, places: 0 });
    });

    it('looks reports up by submitter in the replication key index', async () => {
      await plan(PARAMS);

      const { uri, body } = reports.args[0][0];
      expect(uri).to.include('_design/medic/_nouveau/docs_by_replication_key');
      expect(body.q).to.equal('submitter:("clinic-1" OR "person-1")');
    });

    it('matches submitter ids verbatim, because the index uses the keyword analyzer', async () => {
      query.withArgs('medic/contacts_by_depth', subtreeOf).resolves({ rows: [ { id: 'PeRson-1' } ] });

      await plan(PARAMS);

      expect(reports.args[0][0].body.q).to.equal('submitter:("PeRson-1")');
    });

    it('chunks the submitter query rather than naming every contact at once', async () => {
      sinon.stub(nouveau, 'BATCH_LIMIT').value(1);

      await plan(PARAMS);

      expect(reports.args.map(([ opts ]) => opts.body.q))
        .to.deep.equal([ 'submitter:("clinic-1")', 'submitter:("person-1")' ]);
    });

    it('skips a report whose submitter the index does not report', async () => {
      reports.resolves({ hits: [ { id: 'report-1', fields: {} } ] });

      const { actions } = await plan(PARAMS);

      expect(actions[1].operations).to.deep.equal([]);
    });

    it('skips a report whose submitter is not in the moved subtree', async () => {
      // Defensive: the query only names contacts in the subtree, but an author can change between the
      // index read and the write, and a stale index can answer with one that has already moved away.
      reports.resolves({ hits: [ { id: 'report-1', fields: { submitter: 'outsider' } } ] });

      const { summary, actions } = await plan(PARAMS);

      expect(actions[1].operations).to.deep.equal([]);
      expect(summary['set-contact']).to.deep.equal({ reports: 0, places: 0 });
    });

    it('pages the nouveau results with the bookmark rather than capping them', async () => {
      sinon.stub(nouveau, 'RESULTS_LIMIT').value(2);
      reports.onFirstCall().resolves({ hits: [ { id: 'r-1' }, { id: 'r-2' } ], bookmark: 'page-2' });
      reports.onSecondCall().resolves({ hits: [ { id: 'r-3' } ] });

      await plan(PARAMS);

      expect(reports.callCount).to.equal(2);
      expect(reports.args[0][0].body.bookmark).to.be.null;
      expect(reports.args[1][0].body.bookmark).to.equal('page-2');
      // the whole result set is asked for in one page rather than in batches
      expect(reports.args[0][0].body.limit).to.equal(nouveau.RESULTS_LIMIT);
    });

    it('stops paging when the bookmark does not advance, rather than looping forever', async () => {
      sinon.stub(nouveau, 'RESULTS_LIMIT').value(2);
      // A misbehaving index that keeps returning a full page and the same bookmark.
      reports.resolves({ hits: [ { id: 'r-1' }, { id: 'r-2' } ], bookmark: 'stuck' });

      await plan(PARAMS);

      expect(reports.callCount).to.equal(2);
    });

    it('escapes quotes and backslashes in ids before they reach the query', async () => {
      query.withArgs('medic/contacts_by_depth', subtreeOf).resolves({ rows: [ { id: 'we"ird\\id' } ] });

      await plan(PARAMS);

      expect(reports.args[0][0].body.q).to.equal('submitter:("we\\"ird\\\\id")');
    });

    it('refreshes a surviving place whose primary contact moved, without clearing it', async () => {
      // The view emits the primary contact's id as the row key.
      query.withArgs('medic/contacts_by_primary_contact').resolves({ rows: [ { id: 'hc-a', key: 'person-1' } ] });

      const { summary, actions } = await plan(PARAMS);

      expect(actions[1].operations).to.deep.equal([ {
        id: 'hc-a',
        current_contact_id: 'person-1', // reference kept, only the lineage refreshed
        contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
      } ]);
      expect(summary['set-contact']).to.deep.equal({ reports: 0, places: 1 });
    });

    it('refreshes a moving place whose own primary contact is moving with it', async () => {
      // The source is also the holder of its own primary contact, so both fields have to be rewritten.
      query.withArgs('medic/contacts_by_primary_contact')
        .resolves({ rows: [ { id: 'clinic-1', key: 'person-1' } ] });

      const { summary, actions } = await plan(PARAMS);

      expect(actions[1].operations).to.deep.equal([ {
        id: 'clinic-1',
        current_contact_id: 'person-1',
        contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
      } ]);
      expect(summary['set-contact']).to.deep.equal({ reports: 0, places: 1 });
    });

    it('moves to the top level when parent_id is null', async () => {
      const { actions } = await plan({ contact_id: 'clinic-1', parent_id: null });

      expect(contactGet.calledWith(Qualifier.byUuid('hc-b'))).to.equal(false);
      expect(actions[0].operations).to.deep.equal([
        { id: 'clinic-1', current_parent_id: 'hc-a', parent: undefined },
        { id: 'person-1', current_parent_id: 'clinic-1', parent: { _id: 'clinic-1' } },
      ]);
    });

    it('handles a source that is already at the root, which has no parent to record', async () => {
      contactGet.withArgs(Qualifier.byUuid('clinic-1')).resolves({ _id: 'clinic-1', type: 'clinic' });

      const { actions } = await plan(PARAMS);

      expect(actions[0].operations).to.deep.equal([
        { id: 'clinic-1', current_parent_id: undefined, parent: UNDER_HC_B },
        { id: 'person-1', current_parent_id: 'clinic-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
      ]);
    });
  });

  describe('validate', () => {
    it('passes when the move is legal', async () => {
      await expect(validate(PARAMS)).to.be.fulfilled;

      expect(constraints.assertMoveIsLegal.args[0][0]).to.deep.equal(clinic);
      expect(constraints.assertMoveIsLegal.args[0][1]).to.deep.equal(healthCenterB);
      expect(constraints.assertMoveIsLegal.args[0][2]).to.deep.equal([ 'clinic-1', 'person-1' ]);
    });

    it('reports an illegal move', async () => {
      constraints.assertMoveIsLegal.rejects(new ValidationError('circular hierarchy'));

      await expect(validate(PARAMS)).to.be.rejectedWith('circular hierarchy');
    });

    it('refuses a contact that no longer exists', async () => {
      contactGet.withArgs(Qualifier.byUuid('clinic-1')).resolves(null);

      const err = await validate(PARAMS).catch(e => e);

      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.equal(`contact 'clinic-1' not found`);
    });

    it('refuses a destination that no longer exists', async () => {
      contactGet.withArgs(Qualifier.byUuid('hc-b')).resolves(null);

      const err = await validate(PARAMS).catch(e => e);

      expect(err).to.be.an.instanceOf(ValidationError);
      expect(err.message).to.equal(`destination contact 'hc-b' not found`);
    });
  });
});
