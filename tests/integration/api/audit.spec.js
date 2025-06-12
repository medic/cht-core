const utils = require('@utils');
const dataFactory = require('@factories/cht/generate');
const constants = require('@constants');

const docs = dataFactory.createHierarchy({ name: 'base', user: true, nbrClinics: 2 });
const docIds = [...docs.places, ...docs.persons, ...docs.reports].map(d => d._id);

const getAudit = async (docIds) => {
  await utils.delayPromise(100); // delay for audit write
  docIds = Array.isArray(docIds) ? docIds : [docIds];
  const medicDocs = await utils.db.allDocs({ keys: docIds, include_docs: true });
  const auditDocs = await utils.auditDb.allDocs({ keys: docIds, include_docs: true });

  const docs = {};
  docIds.forEach((docId, idx) => {
    docs[docId] = {
      audit: auditDocs.rows[idx].doc,
      doc: medicDocs.rows[idx].doc,
    };
  });

  if (docIds.length === 1) {
    return docs[docIds[0]];
  }

  return docs;
};

const checkAudit = ({ audit, doc }, user, requestId) => {
  const revCount = parseInt(doc._rev.split('-')[0]);
  expect(audit.history.length).to.equal(revCount);
  const lastChange = audit.history.at(-1);
  expect(lastChange.rev).to.equal(doc._rev);
  expect(lastChange.user).to.equal(user || constants.USERNAME);
  expect(lastChange.date).to.be.ok;
  expect(lastChange.service).to.equal('api');
  requestId && expect(lastChange.request_id).to.be.ok;
};

describe('auditing', () => {
  before(async () => {
    await utils.saveDocs([...docs.places, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
  });

  it('should audit created docs', async () => {
    const audit = await getAudit(docIds);
    docIds.forEach((id) => checkAudit(audit[id]));
  });

  describe('for online users', () => {
    it('should ignore GET', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.db.get(docId);
      const auditAfter = await getAudit(docId);
      expect(auditBefore.audit).to.deep.equal(auditAfter.audit);
    });

    it('should ignore _all_docs', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.db.allDocs({ keys: [docId] });
      const auditAfter = await getAudit(docId);
      expect(auditBefore.audit).to.deep.equal(auditAfter.audit);
    });

    it('should ignore _bulk_get', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.db.bulkGet({ docs: [{ id: docId }] });
      const auditAfter = await getAudit([docId]);
      expect(auditBefore.audit).to.deep.equal(auditAfter.audit);
    });

    it('should add entry on POST', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.saveDoc(auditBefore.doc);
      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
      checkAudit(auditAfter);
    });

    it('should add entry on PUT', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.db.put(auditBefore.doc);
      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
      checkAudit(auditAfter);
    });

    it('should add entry on _bulk_docs', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.db.bulkDocs([auditBefore.doc]);
      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
      checkAudit(auditAfter);
    });

    it('should add entry on _bulk_docs with new_edits', async () => {
      const docId = docIds[0];
      const auditBefore = await getAudit(docId);
      await utils.db.bulkDocs([auditBefore.doc], { new_edits: false });
      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
    });
  }); 
  
  describe('for offline users', () => {
    const auth = { username: docs.user.username, password: docs.user.password };
    it('should ignore GET', async () => {
      const docId = docs.reports[0]._id;
      const auditBefore = await getAudit(docId);

      await utils.request({ path: `/medic/${docId}`, auth });

      const auditAfter = await getAudit(docId);
      expect(auditBefore.audit).to.deep.equal(auditAfter.audit);
    });

    it('should ignore _all_docs', async () => {
      const docId = docs.reports[0]._id;
      const auditBefore = await getAudit(docId);

      await utils.request({ path: `/medic/_all_docs`, qs: { key: docId }, auth });

      const auditAfter = await getAudit(docId);
      expect(auditBefore.audit).to.deep.equal(auditAfter.audit);
    });

    it('should ignore _bulk_get', async () => {
      const docId = docs.reports[0]._id;
      const auditBefore = await getAudit(docId);

      await utils.request({
        path: `/medic/_bulk_get`,
        method: 'POST',
        body: { docs: [{ id: docId }] },
        auth,
      });

      const auditAfter = await getAudit(docId);
      expect(auditBefore.audit).to.deep.equal(auditAfter.audit);
    });

    it('should add entry on PUT', async () => {
      const docId = docs.reports[0]._id;
      const auditBefore = await getAudit(docId);

      await utils.requestOnTestDb({
        path: `/`,
        method: 'POST',
        body: auditBefore.doc,
        auth,
      });

      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
      checkAudit(auditAfter, auth.username);
    });

    it('should add entry on _bulk_docs', async () => {
      const docId = docs.reports[0]._id;
      const auditBefore = await getAudit(docId);

      await utils.requestOnTestDb({
        path: `/_bulk_docs`,
        method: 'POST',
        body: { docs: [auditBefore.doc] },
        auth,
      });

      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
      checkAudit(auditAfter, auth.username);
    });

    it('should add entry on _bulk_docs with new_edits', async () => {
      const docId = docs.reports[0]._id;
      const auditBefore = await getAudit(docId);

      await utils.requestOnTestDb({
        path: `/_bulk_docs`,
        method: 'POST',
        body: { docs: [auditBefore.doc], new_edits: false },
        auth,
      });

      const auditAfter = await getAudit(docId);

      expect(auditAfter.audit.history.length).to.equal(auditBefore.audit.history.length + 1);
    });
  });

  describe('api db', () => {
    it('should audit default docs on install', async () => {
      const docIds = ['messages-en', '_design/medic'];
      const audit = await getAudit(docIds);
      docIds.forEach((id) => checkAudit(audit[id]));
    });

    it('should not audit service worker cache', async () => {
      const audit = await getAudit('service-worker-meta');
      expect(audit.audit).to.be.undefined;
    });

    it('should only store 10 history entries', async () => {
      const docId = 'migration-log';
      const MAX_HISTORY_LIMIT = 10;
      const doc = await utils.db.get(docId);
      const revCount = parseInt(doc._rev.split('-')[0]);

      const auditDocs = await utils.auditDb.allDocs({
        start_key: docId,
        end_key: `${docId}\ufff0`,
        include_docs: true
      });
      expect(auditDocs.rows.length).to.equal(Math.ceil(revCount / MAX_HISTORY_LIMIT));

      expect(auditDocs.rows[0].doc.history.length).to.equal(revCount % MAX_HISTORY_LIMIT);
      expect(auditDocs.rows[1].doc.history.length).to.equal(MAX_HISTORY_LIMIT);
    });
  });
});
