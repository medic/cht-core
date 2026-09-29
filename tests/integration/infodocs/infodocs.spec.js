const { assert } = require('chai');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v7;
const moment = require('moment');

//
// API and sentinel write infodocs independently, in no guaranteed order, so waiting for one says
// nothing about the other: both have to be waited on.
//
// Sentinel advances the sequence in its metadata doc as it processes changes, which is what
// `waitForSentinel` watches. API has no equivalent marker: it records infodoc writes after it has
// already responded (see the uses of the controller in ./api/controllers/infodoc), so nothing in
// the response says whether that has happened yet. The write itself is the signal - API stamps
// latest_replication_date with the time it handled the request, so a date at or after `since` is
// this request's write.
//
const waitForApiInfoDocWrites = async (ids, since, retries = 15) => {
  const infoDocs = await sentinelUtils.getInfoDocs(ids);
  const recorded = infoDoc => infoDoc && new Date(infoDoc.latest_replication_date).getTime() >= since;

  if (infoDocs.every(recorded)) {
    return;
  }

  if (retries <= 0) {
    throw new Error(`Timed out waiting for api to record infodoc writes for ${ids}`);
  }

  await utils.delayPromise(100);
  return waitForApiInfoDocWrites(ids, since, retries - 1);
};

// `since` is the time the request that api should have recorded was made; omit it when api is not
// expected to write, and only sentinel is waited on.
const delayedInfoDocsOf = async (ids, since) => {
  if (since) {
    await waitForApiInfoDocWrites(ids, since);
  }
  await sentinelUtils.waitForSentinel(ids);
  return sentinelUtils.getInfoDocs(ids);
};

describe('infodocs', () => {
  afterEach(() => utils.revertDb([], true));

  const singleDocTest = async (method) => {
    const doc = {
      _id: 'infodoc-maintain-on-' + method,
      some: 'data'
    };
    const path = method === 'PUT' ? `/${doc._id}` : '/';
    let infoDoc;

    const beforeCreate = Date.now();
    const result = await utils.requestOnTestDb({ path, method, body: doc });
    assert.isTrue(result.ok);
    doc._rev = result.rev;
    doc.more = 'data';

    [infoDoc] = await delayedInfoDocsOf(doc._id, beforeCreate);

    assert.deepInclude(infoDoc, {
      _id: doc._id + '-info',
      type: 'info',
      doc_id: doc._id
    });

    assert.isOk(infoDoc.initial_replication_date);
    assert.isOk(infoDoc.latest_replication_date);

    const beforeUpdate = Date.now();
    const update = await utils.requestOnTestDb({ path, method, body: doc });
    assert.isTrue(update.ok);

    const [updatedInfodoc] = await delayedInfoDocsOf(doc._id, beforeUpdate);

    assert.equal(updatedInfodoc.initial_replication_date, infoDoc.initial_replication_date);
    assert.notEqual(updatedInfodoc.latest_replication_date, infoDoc.latest_replication_date);

    infoDoc = updatedInfodoc;

    try {
      await utils.requestOnTestDb({ path, method, body: doc });
      assert.fail('request should fail with conflict');
    } catch (err) {
      assert.equal(err.status, 409);
    }

    const [newInfoDoc] = await delayedInfoDocsOf(doc._id);
    assert.equal(newInfoDoc.initial_replication_date, infoDoc.initial_replication_date);
    assert.equal(newInfoDoc.latest_replication_date, infoDoc.latest_replication_date);

    doc._deleted = true;
    doc._rev = update.rev;

    await utils.requestOnTestDb({ path, method, body: doc });

    await utils.runSentinelTasks();

    const waitForLogs = await utils.waitForSentinelLogs(false, /Task backgroundCleanup completed/);
    await waitForLogs.promise;

    const results = await delayedInfoDocsOf(doc._id);
    assert.equal(results[0], undefined);
  };

  // These tests are using an admin user
  // For infodoc tests that check that restricted user security is followed
  // correctly, see the tests for the action in question (e.g. bulk-docs.spec.js)
  describe('maintaining replication dates', () => {
    it('on PUT', () => singleDocTest('PUT'));
    it('on POST', () => singleDocTest('POST'));

    it('on bulk docs', async () => {
      const docs = [
        {
          'no_id': 'to_begin_with'
        },
        {
          _id: 'written-to-twice-successfully'
        },
        {
          _id: 'first-write-works-second-fails'
        }
      ];

      const beforeCreate = Date.now();
      const result = await utils.db.bulkDocs(docs);
      assert.equal(result.filter(r => r.ok).length, docs.length);

      docs[0]._id = result[0].id;
      docs[0]._rev = result[0].rev;
      docs[1]._rev = result[1].rev;

      const infoDocs = await delayedInfoDocsOf(docs.map(d => d._id), beforeCreate);

      assert.equal(infoDocs.length, 3);
      infoDocs.forEach((infoDoc, idx) => {
        const doc = docs[idx];

        assert.deepInclude(infoDoc, {
          _id: doc._id + '-info',
          type: 'info',
          doc_id: doc._id
        }, `infodoc for ${doc._id} created correctly`);
        assert.isOk(infoDoc.initial_replication_date, `infodoc initial_replication_date for ${doc._id} exists`);
        assert.isOk(infoDoc.latest_replication_date, `infodoc latest_replication_date for ${doc._id} exists`);
      });

      const beforeUpdate = Date.now();
      const update = await utils.db.bulkDocs(docs);
      assert.isTrue(update[0].ok);
      assert.isTrue(update[1].ok);
      assert.isNotOk(update[2].ok);

      docs[0]._rev = update[0].rev;
      docs[1]._rev = update[1].rev;

      // the third write conflicted, so api has nothing to record for it
      await waitForApiInfoDocWrites([docs[0]._id, docs[1]._id], beforeUpdate);
      const newInfoDocs = await delayedInfoDocsOf(docs.map(d => d._id));

      assert.notEqual(newInfoDocs[0].latest_replication_date, infoDocs[0].latest_replication_date);
      assert.notEqual(newInfoDocs[1].latest_replication_date, infoDocs[1].latest_replication_date);
      assert.equal(newInfoDocs[2].latest_replication_date, infoDocs[2].latest_replication_date);
    });
  });

  describe('transitions infos', () => {
    it('should set correct transition date', async () => {
      const settings = {
        transitions: { generate_shortcode_on_contacts: true }
      };
      await utils.updateSettings(settings, { ignoreReload: 'sentinel' });

      const doc = { _id: uuid(), type: 'person' };
      const { rev } = await utils.saveDoc(doc);

      const sentinelDate = await utils.getSentinelDate();
      const [infoDoc] = await delayedInfoDocsOf(doc._id);

      assert.deepNestedInclude(infoDoc, {
        _id: doc._id + '-info',
        type: 'info',
        doc_id: doc._id,
        'transitions.generate_shortcode_on_contacts.last_rev': rev,
        'transitions.generate_shortcode_on_contacts.ok': true,
      });
      const transitionTs = moment(infoDoc.transitions.generate_shortcode_on_contacts.run_date);
      assert.equal(transitionTs.diff(sentinelDate, 'minute'), 0);
    });
  });
});
