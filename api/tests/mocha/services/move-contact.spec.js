const sinon = require('sinon');
const { expect } = require('chai');
const { Contact, Qualifier } = require('@medic/cht-datasource');

const db = require('../../../src/db');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const dataContext = require('../../../src/services/data-context');
const { NotFoundError, BadRequestError } = require('../../../src/errors');
const request = require('@medic/couch-request');
const nouveau = require('@medic/nouveau');
const bulkOperations = require('../../../src/services/bulk-operations');
const constraints = require('../../../src/services/lineage-constraints');
const moveContact = require('../../../src/services/move-contact');

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

const buildRes = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

const buildReq = (overrides = {}) => ({
  params: { uuid: 'clinic-1' },
  query: {},
  body: { parent_id: 'hc-b' },
  ...overrides,
});

describe('move-contact service', () => {
  let contactGet;
  let handler;
  let queue;
  let reports;

  beforeEach(() => {
    contactGet = sinon.stub().resolves(healthCenterB);
    sinon.stub(dataContext, 'bind').withArgs(Contact.v1.get).returns(contactGet);
    sinon.stub(auth, 'assertPermissions').resolves();
    sinon.stub(serverUtils, 'error');
    sinon.stub(constraints, 'assertMoveIsLegal').resolves();
    queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:1');

    sinon.stub(db.medic, 'query');
    db.medic.query.withArgs('medic/contacts_by_depth', subtreeOf)
      .resolves({ rows: [ { id: 'clinic-1' }, { id: 'person-1' } ] });
    // The person sits under the clinic. The clinic's own parent is outside the subtree, so the view
    // never emits a row for it and it has to come off the source document instead.
    db.medic.query.withArgs('medic/contacts_by_depth', atDepthOne)
      .resolves({ rows: [ { id: 'person-1', key: [ 'clinic-1', 1 ] } ] });
    db.medic.query.withArgs('medic/contacts_by_primary_contact').resolves({ rows: [] });

    sinon.stub(request, 'post');
    reports = request.post.withArgs(reportQuery).resolves({ hits: [] });

    handler = moveContact.handleMove({ get: sinon.stub().resolves(clinic), type: 'Place' });
  });

  afterEach(() => sinon.restore());

  it('queues both actions and responds 202 with the summary', async () => {
    const res = buildRes();

    await handler(buildReq(), res);

    expect(auth.assertPermissions.args[0][1]).to.deep.equal({
      isOnline: true,
      hasAll: [ 'can_move_contact_hierarchy' ],
    });
    expect(res.status.args[0][0]).to.equal(202);

    const [ actions ] = queue.args[0];
    expect(actions.map(a => a.action)).to.deep.equal([ 'set-parent', 'set-contact' ]);

    // The source's parent is replaced outright; the descendant keeps the clinic and gains the new
    // chain above it.
    expect(actions[0].operations).to.deep.equal([
      { id: 'clinic-1', current_parent_id: 'hc-a', parent: UNDER_HC_B },
      { id: 'person-1', current_parent_id: 'clinic-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
    ]);

    expect(res.json.args[0][0]).to.deep.equal({
      summary: { 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } },
      id: 'bulk-operation:1',
    });
  });

  it('answers everything from indexes without reading a single document', async () => {
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
    reports.resolves({ hits: [ { id: 'report-1', fields: { submitter: 'person-1' } } ] });

    await handler(buildReq(), buildRes());

    expect(allDocs.called).to.equal(false);
  });

  it('asks the view for the parents in one query, keyed at depth one', async () => {
    await handler(buildReq(), buildRes());

    const parentCalls = db.medic.query.args
      .filter(([ view, opts ]) => view === 'medic/contacts_by_depth' && opts.keys);
    expect(parentCalls).to.have.lengthOf(1);
    expect(parentCalls[0][1].keys).to.deep.equal([ [ 'clinic-1', 1 ], [ 'person-1', 1 ] ]);
  });

  it('takes the source own parent from the document, which the view cannot report', async () => {
    // The view is keyed on the subtree and the source's parent sits outside it, so nothing comes back.
    db.medic.query.withArgs('medic/contacts_by_depth', atDepthOne).resolves({ rows: [] });

    await handler(buildReq(), buildRes());

    const [ sourceOp ] = queue.args[0][0][0].operations;
    expect(sourceOp).to.deep.equal({ id: 'clinic-1', current_parent_id: 'hc-a', parent: UNDER_HC_B });
  });

  it('fetches the destination through cht-datasource', async () => {
    await handler(buildReq(), buildRes());

    expect(contactGet.args[0]).to.deep.equal([ Qualifier.byUuid('hc-b') ]);
  });

  it('responds 200 with the summary and queues nothing for a dry run', async () => {
    const res = buildRes();

    await handler(buildReq({ query: { dry_run: 'true' } }), res);

    expect(queue.called).to.equal(false);
    expect(res.status.args[0][0]).to.equal(200);
    expect(res.json.args[0][0]).to.deep.equal({
      summary: { 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } },
    });
  });

  it('refreshes the cached lineage on reports the moved contacts authored', async () => {
    reports.resolves({ hits: [ { id: 'report-1', fields: { submitter: 'person-1' } } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    const setContact = queue.args[0][0][1].operations;
    expect(setContact).to.deep.equal([ {
      id: 'report-1',
      current_contact_id: 'person-1',
      contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
    } ]);
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 1, places: 0 });
  });

  it('looks reports up by submitter in the replication key index', async () => {
    await handler(buildReq(), buildRes());

    const { uri, body } = reports.args[0][0];
    expect(uri).to.include('_design/medic/_nouveau/docs_by_replication_key');
    expect(body.q).to.equal('submitter:("clinic-1" OR "person-1")');
  });

  it('matches submitter ids verbatim, because the index uses the keyword analyzer', async () => {
    db.medic.query.withArgs('medic/contacts_by_depth', subtreeOf)
      .resolves({ rows: [ { id: 'PeRson-1' } ] });

    await handler(buildReq(), buildRes());

    expect(reports.args[0][0].body.q).to.equal('submitter:("PeRson-1")');
  });

  it('chunks the submitter query rather than naming every contact at once', async () => {
    sinon.stub(nouveau, 'BATCH_LIMIT').value(1);

    await handler(buildReq(), buildRes());

    expect(reports.args.map(([ opts ]) => opts.body.q))
      .to.deep.equal([ 'submitter:("clinic-1")', 'submitter:("person-1")' ]);
  });

  it('skips a report whose submitter the index does not report', async () => {
    reports.resolves({ hits: [ { id: 'report-1', fields: {} } ] });

    await handler(buildReq(), buildRes());

    expect(queue.args[0][0][1].operations).to.deep.equal([]);
  });

  it('skips a report whose submitter is not in the moved subtree', async () => {
    // Defensive: the query only names contacts in the subtree, but an author can change between the
    // index read and the write, and a stale index can answer with one that has already moved away.
    reports.resolves({ hits: [ { id: 'report-1', fields: { submitter: 'outsider' } } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.args[0][0][1].operations).to.deep.equal([]);
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 0, places: 0 });
  });

  it('pages the nouveau results with the bookmark rather than capping them', async () => {
    sinon.stub(nouveau, 'RESULTS_LIMIT').value(2);
    reports.onFirstCall().resolves({ hits: [ { id: 'r-1' }, { id: 'r-2' } ], bookmark: 'page-2' });
    reports.onSecondCall().resolves({ hits: [ { id: 'r-3' } ] });

    await handler(buildReq(), buildRes());

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

    await handler(buildReq(), buildRes());

    expect(reports.callCount).to.equal(2);
  });

  it('escapes quotes and backslashes in ids before they reach the query', async () => {
    db.medic.query.withArgs('medic/contacts_by_depth', subtreeOf)
      .resolves({ rows: [ { id: 'we"ird\\id' } ] });

    await handler(buildReq(), buildRes());

    expect(reports.args[0][0].body.q).to.equal('submitter:("we\\"ird\\\\id")');
  });

  it('rejects a parent_id that is not a string', async () => {
    const res = buildRes();

    await handler(buildReq({ body: { parent_id: { $ne: null } } }), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.message).to.contain('must be a non-empty string');
  });

  it('rejects an empty parent_id rather than treating it as the root', async () => {
    const res = buildRes();

    await handler(buildReq({ body: { parent_id: '' } }), res);

    expect(queue.called).to.equal(false);
    expect(serverUtils.error.args[0][0]).to.be.an.instanceOf(BadRequestError);
  });

  it('refreshes a surviving place whose primary contact moved, without clearing it', async () => {
    // The view emits the primary contact's id as the row key.
    db.medic.query.withArgs('medic/contacts_by_primary_contact')
      .resolves({ rows: [ { id: 'hc-a', key: 'person-1' } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.args[0][0][1].operations).to.deep.equal([ {
      id: 'hc-a',
      current_contact_id: 'person-1', // reference kept, only the lineage refreshed
      contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
    } ]);
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 0, places: 1 });
  });

  it('refreshes a moving place whose own primary contact is moving with it', async () => {
    // The source is also the holder of its own primary contact, so both fields have to be rewritten.
    db.medic.query.withArgs('medic/contacts_by_primary_contact')
      .resolves({ rows: [ { id: 'clinic-1', key: 'person-1' } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.args[0][0][1].operations).to.deep.equal([ {
      id: 'clinic-1',
      current_contact_id: 'person-1',
      contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
    } ]);
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 0, places: 1 });
  });

  it('moves to the top level when parent_id is omitted', async () => {
    const res = buildRes();

    await handler(buildReq({ body: {} }), res);

    expect(contactGet.called).to.equal(false);
    expect(queue.args[0][0][0].operations).to.deep.equal([
      { id: 'clinic-1', current_parent_id: 'hc-a', parent: undefined },
      { id: 'person-1', current_parent_id: 'clinic-1', parent: { _id: 'clinic-1' } },
    ]);
    expect(res.status.args[0][0]).to.equal(202);
  });

  it('handles a source that is already at the root, which has no parent to record', async () => {
    const rootClinic = { _id: 'clinic-1', type: 'clinic' };
    handler = moveContact.handleMove({ get: sinon.stub().resolves(rootClinic), type: 'Place' });

    await handler(buildReq(), buildRes());

    expect(queue.args[0][0][0].operations).to.deep.equal([
      { id: 'clinic-1', current_parent_id: undefined, parent: UNDER_HC_B },
      { id: 'person-1', current_parent_id: 'clinic-1', parent: { _id: 'clinic-1', parent: UNDER_HC_B } },
    ]);
  });

  it('responds 404 and queues nothing when the target is not the expected type', async () => {
    handler = moveContact.handleMove({ get: sinon.stub().resolves(null), type: 'Place' });
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(NotFoundError);
    expect(err.message).to.equal('Place not found');
  });

  it('responds 400 and queues nothing when the move is not legal', async () => {
    constraints.assertMoveIsLegal.rejects(new BadRequestError('circular hierarchy'));
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.message).to.equal('circular hierarchy');
  });

  it('responds 404 when the destination does not exist', async () => {
    contactGet.resolves(null);
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(NotFoundError);
    expect(err.message).to.equal('Destination contact hc-b not found');
  });
});
