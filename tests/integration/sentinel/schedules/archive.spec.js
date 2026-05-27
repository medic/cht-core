const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));

const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const constants = require('@constants');
const { DOC_TYPES, DOC_IDS } = require('@medic/constants');

const auth = { username: constants.USERNAME, password: constants.PASSWORD };
const archiveDb = new PouchDB(`${constants.BASE_URL}/${constants.DB_NAME}-archive`, { auth });

const postCsv = (csv, opts = {}) => utils.request({
  path: '/api/v1/archive',
  method: 'POST',
  body: csv,
  headers: { 'Content-Type': 'text/csv' },
  ...opts,
});

const cleanupArchiveDb = async () => {
  const result = await archiveDb.allDocs();
  const tombstones = result.rows.map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
  await archiveDb.bulkDocs(tombstones, { new_edits: true });
};

// allDocs wrapper that returns only rows for docs that are present (live) — drops both
// missing rows (`error: 'not_found'`) and deleted tombstone rows (`value.deleted: true`).
const liveRows = async (db, opts = {}) => {
  const result = await db.allDocs(opts);
  return result.rows.filter(row => row.value && !row.value.deleted);
};

const expectFullyPurgedFromMedic = async (ids) => {
  const allDocs = await utils.db.allDocs({ keys: ids });
  const stillPresent = allDocs.rows.filter(row => !row.error);
  expect(stillPresent.length).to.equal(0);

  const changes = await utils.request({
    path: `/${constants.DB_NAME}/_changes`,
    method: 'POST',
    qs: { since: 0, filter: '_doc_ids' },
    body: { doc_ids: ids },
  });
  expect(changes.results.length).to.equal(0);
};

const expectInfoDocsPurged = async (ids) => {
  const infoIds = ids.map(id => `${id}-info`);
  const result = await utils.sentinelDb.allDocs({ keys: infoIds });
  const stillPresent = result.rows.filter(row => !row.error);
  expect(stillPresent).to.deep.equal([]);
};

const expectAuditedArchive = async (ids) => {
  const result = await utils.auditDb.allDocs({ keys: ids, include_docs: true });
  const audited = result.rows.filter(row => row.doc);
  expect(audited.map(row => row.id), ).to.have.members(ids);
  for (const row of audited) {
    const archiveEntries = row.doc.history.filter(h => h.archived);
    const latest = archiveEntries[archiveEntries.length - 1];
    expect(latest.archived).to.equal(true);
  }
};

describe('sentinel processes archive jobs', () => {
  const fixtures = [
    { _id: 'archive-e2e-contact', type: 'contact', name: 'Archived contact' },
    { _id: 'archive-e2e-report', type: DOC_TYPES.DATA_RECORD, form: 'visit', reported_date: 1 },
    { _id: 'archive-e2e-task', type: 'task', state: 'Completed' },
    { _id: 'archive-e2e-target', type: 'target', targets: [] },
    { _id: 'archive-e2e-random', type: 'random', info: 'not archivable' },
  ];
  const archivableIds = fixtures
    .filter(d => d._id !== 'archive-e2e-random')
    .map(d => d._id);
  const nonArchivableIds = [
    'messages-en',
    '_design/medic',
    'form:pregnancy',
    ...Object.values(DOC_IDS),
  ];
  const allIds = fixtures.map(d => d._id);

  // Some entries in `nonArchivableIds` are present by default in a fresh test db
  // (e.g. `_design/medic`, `settings`) and others (e.g. `partners`)
  // are not.
  const ensureExists = async (id) => {
    try {
      await utils.db.get(id);
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
      await utils.db.put({ _id: id, type: 'archive-e2e-stub' });
    }
  };

  const runArchiving = async (skipTransitions) => {
    await utils.updateSettings(
      { archive: { text_expression: 'every 1 seconds' } },
      { ignoreReload: true }
    );
    if (skipTransitions) {
      await utils.toggleSentinelTransitions();
      await sentinelUtils.skipToSeq();
      // sometimes there's an ongoing process that creates info docs.
      await utils.delayPromise(3000);
    }

    await utils.runSentinelTasks();
    await sentinelUtils.waitForArchiveCompletion();
  };

  before(async () => {
    await utils.saveDocs(fixtures);
    await Promise.all(nonArchivableIds.map(ensureExists));
  });

  after(async () => {
    await cleanupArchiveDb();
  });

  beforeEach(async () => {
    await utils.toggleSentinelTransitions();
    await sentinelUtils.skipToSeq();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('moves archivable docs to the archive db and purges them from medic', async function () {
    this.timeout(60000);

    // Snapshot the originals so we can compare body-for-body after archive runs.
    const originals = await utils.db.allDocs({ keys: archivableIds, include_docs: true });
    const originalById = Object.fromEntries(originals.rows.map(row => [row.id, row.doc]));

    const csv = [...allIds, ...nonArchivableIds].join('\n');
    const { jobs } = await postCsv(csv);
    expect(jobs).to.have.lengthOf(1);

    await runArchiving();

    const archiveRows = await liveRows(archiveDb, { keys: archivableIds, include_docs: true });
    expect(archiveRows).to.have.lengthOf(archivableIds.length);
    for (const row of archiveRows) {
      expect(row.doc).excluding('archive_date').to.deep.equal(originalById[row.id]);
    }

    await expectFullyPurgedFromMedic(archivableIds);
    await expectInfoDocsPurged(archivableIds);
    await expectAuditedArchive(archivableIds);

    const survivors = ['archive-e2e-random', ...nonArchivableIds];
    const medicSurvivorIds = (await liveRows(utils.db, { keys: survivors })).map(row => row.id);
    expect(medicSurvivorIds ).to.have.members(survivors);

    const archiveSurvivorIds = (await liveRows(archiveDb, { keys: survivors })).map(row => row.id);
    expect(archiveSurvivorIds).to.deep.equal([]);
  });

  it('processes a multi-batch payload, archiving thousands of docs', async function () {
    this.timeout(180000);

    // Larger than BATCH_SIZE (1000) so the archive loop has to take more than one batch
    // and persist the cursor between them.
    const COUNT = 30000;
    const bulkDocs = Array.from({ length: COUNT }, (_, i) => ({
      _id: `archive-e2e-bulk-${String(i).padStart(5, '0')}`,
      type: DOC_TYPES.DATA_RECORD,
      form: 'visit',
      fields: { patient_id: `p-${i}` },
      reported_date: 1,
    }));

    await utils.saveDocs(bulkDocs);
    const ids = bulkDocs.map(d => d._id);

    const { jobs } = await postCsv(ids.join('\n'));
    expect(jobs).to.have.lengthOf(1);
    expect(jobs[0].count).to.equal(COUNT);

    await runArchiving(true);

    const archived = await liveRows(archiveDb, { keys: ids });
    expect(archived).to.have.lengthOf(COUNT);

    await expectFullyPurgedFromMedic(ids);
    await expectInfoDocsPurged(ids);
    await expectAuditedArchive(ids);
  });

  it('exits at the duration deadline and resumes on the next run', async function () {
    this.timeout(180000);

    // 2000 docs = 2 batches at BATCH_SIZE=1000 with a tight 10ms deadline
    const COUNT = 2000;
    const bulkDocs = Array.from({ length: COUNT }, (_, i) => ({
      _id: `archive-e2e-resume-${String(i).padStart(5, '0')}`,
      type: DOC_TYPES.DATA_RECORD,
      form: 'visit',
      fields: { patient_id: `p-${i}` },
      reported_date: 1,
    }));
    await utils.saveDocs(bulkDocs);
    const ids = bulkDocs.map(d => d._id);

    const { jobs } = await postCsv(ids.join('\n'));
    expect(jobs).to.have.lengthOf(1);
    const jobId = jobs[0].id;

    await utils.updateSettings(
      { archive: { text_expression: 'every 1 seconds', duration: '50 milliseconds' } },
      { ignoreReload: 'sentinel' }
    );
    await sentinelUtils.skipToSeq();
    await utils.toggleSentinelTransitions();

    // First run: one batch lands, deadline fires
    const firstRunDone = await utils.waitForSentinelLogs(true, /Finished archiving/);
    await utils.runSentinelTasks();
    await firstRunDone.promise;

    const partial = await utils.sentinelDb.get(jobId);
    expect(partial.cursor ).to.be.greaterThan(0);
    expect(partial.cursor ).to.be.lessThan(COUNT);

    const partiallyArchived = await liveRows(archiveDb, { keys: ids });
    expect(partiallyArchived).to.have.lengthOf(partial.cursor);
    const stillInMedic = await liveRows(utils.db, { keys: ids });
    expect(stillInMedic).to.have.lengthOf(COUNT - partial.cursor);

    await utils.runSentinelTasks();
    await sentinelUtils.waitForArchiveCompletion();

    const archived = await liveRows(archiveDb, { keys: ids });
    expect(archived).to.have.lengthOf(COUNT);
    await expectFullyPurgedFromMedic(ids);
    await expectInfoDocsPurged(ids);
    await expectAuditedArchive(ids);
  });

  it('preserves attachments when archiving', async function () {
    this.timeout(60000);

    const id = 'archive-e2e-with-attachment';
    const payload = 'hello archived world';
    const doc = {
      _id: id,
      type: DOC_TYPES.DATA_RECORD,
      form: 'visit',
      reported_date: 1,
      _attachments: {
        'note.txt': {
          content_type: 'text/plain',
          data: Buffer.from(payload, 'utf8').toString('base64'),
        },
      },
    };
    await utils.saveDocs([doc]);

    await postCsv(id);

    await runArchiving();

    const archived = await archiveDb.get(id, { attachments: true });
    expect(archived._attachments['note.txt'].content_type).to.equal('text/plain');
    const restored = Buffer.from(archived._attachments['note.txt'].data, 'base64').toString('utf8');
    expect(restored).to.equal(payload);

    await expectFullyPurgedFromMedic([id]);
    await expectInfoDocsPurged([id]);
    await expectAuditedArchive([id]);
  });

  it('purges every revision when the source doc has conflicts', async function () {
    this.timeout(60000);

    const id = 'archive-e2e-with-conflict';

    const revA = '1-a000000000000000000000000000000a';
    const revB = '1-b000000000000000000000000000000b';
    const docA = { _id: id, _rev: revA, type: DOC_TYPES.DATA_RECORD, form: 'visit', reported_date: 1, source: 'A' };
    const docB = { _id: id, _rev: revB, type: DOC_TYPES.DATA_RECORD, form: 'visit', reported_date: 1, source: 'B' };

    await utils.request({
      path: `/${constants.DB_NAME}/_bulk_docs`,
      method: 'POST',
      body: { docs: [docA, docB], new_edits: false },
    });

    // Sanity check: the doc has a conflict before we archive.
    const beforeArchive = await utils.db.get(id, { conflicts: true });
    expect(beforeArchive._conflicts).to.have.lengthOf(1);

    await postCsv(id);

    await runArchiving();

    const archived = await archiveDb.get(id);
    expect(archived._rev).to.equal(revB);
    expect(archived.source).to.equal('B');

    await expectFullyPurgedFromMedic([id]);
    await expectInfoDocsPurged([id]);
    await expectAuditedArchive([id]);
  });
});
