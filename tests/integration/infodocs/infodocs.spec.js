const { assert } = require('chai');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const moment = require('moment');

//
// NB: using sentinel processing to delay the reading of infodocs is not guaranteed to be successful
// here, but as of writing seems stable. The API code (see the uses of the controller in
// ./api/controllers/infodoc) happens asynchronously so it doesn't affect request performance. This
// means there is no way to know it's run: it just so happens to run faster than sentinel takes to
// process.
//
/* eslint-disable no-console */
const delayedInfoDocsOf = async (ids) => {
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

    const result = await utils.requestOnTestDb({ path, method, body: doc });
    assert.isTrue(result.ok);
    doc._rev = result.rev;
    doc.more = 'data';

    [infoDoc] = await delayedInfoDocsOf(doc._id);

    assert.deepInclude(infoDoc, {
      _id: doc._id + '-info',
      type: 'info',
      doc_id: doc._id
    });

    assert.isOk(infoDoc.initial_replication_date);
    assert.isOk(infoDoc.latest_replication_date);

    const update = await utils.requestOnTestDb({ path, method, body: doc });
    assert.isTrue(update.ok);

    const [updatedInfodoc] = await delayedInfoDocsOf(doc._id);

    assert.equal(updatedInfodoc.initial_replication_date, infoDoc.initial_replication_date);
    assert.notEqual(updatedInfodoc.latest_replication_date, infoDoc.latest_replication_date);

    infoDoc = updatedInfodoc;

    try {
      await utils.requestOnTestDb({ path, method, body: doc });
      assert.fail('request should fail with conflict');
    } catch (err) {
      assert.equal(err.statusCode, 409);
    }

    const [newInfoDoc] = await delayedInfoDocsOf(doc._id);
    assert.equal(newInfoDoc.initial_replication_date, infoDoc.initial_replication_date);
    assert.equal(newInfoDoc.latest_replication_date, infoDoc.latest_replication_date);

    doc._deleted = true;
    doc._rev = update.rev;

    await utils.requestOnTestDb({ path, method, body: doc });

    await utils.stopSentinel();
    await utils.startSentinel(true);

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

      const result = await utils.db.bulkDocs(docs);
      assert.equal(result.filter(r => r.ok).length, docs.length);

      docs[0]._id = result[0].id;
      docs[0]._rev = result[0].rev;
      docs[1]._rev = result[1].rev;

      const infoDocs = await delayedInfoDocsOf(docs.map(d => d._id));

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

      const update = await utils.db.bulkDocs(docs);
      assert.isTrue(update[0].ok);
      assert.isTrue(update[1].ok);
      assert.isNotOk(update[2].ok);

      docs[0]._rev = update[0].rev;
      docs[1]._rev = update[1].rev;

      const newInfoDocs = await delayedInfoDocsOf(docs.map(d => d._id));

      assert.notEqual(newInfoDocs[0].latest_replication_date, infoDocs[0].latest_replication_date);
      assert.notEqual(newInfoDocs[1].latest_replication_date, infoDocs[1].latest_replication_date);
      assert.equal(newInfoDocs[2].latest_replication_date, infoDocs[2].latest_replication_date);
    });
  });

  describe('legacy data support', () => {
    it('finds and migrates data from the medic doc', async () => {
      const testDoc = {
        _id: 'yuiop',
        data: 'data',
        transitions: {
          some: 'transition info'
        }
      };

      await utils.stopSentinel();
      const result = await utils.db.post(testDoc);
      testDoc._rev = result.rev;

      await utils.setTransitionSeqToNow();
      await utils.startSentinel(true);

      testDoc.data = 'data changed';
      await utils.saveDoc(testDoc);

      const [infodoc] = await delayedInfoDocsOf(testDoc._id);

      assert.isOk(infodoc.initial_replication_date, 'expected an initial_replication_date');
      assert.isOk(infodoc.latest_replication_date, 'expected a latest_replication_date');
      assert.deepEqual(infodoc.transitions, { some: 'transition info' });
    });

    it('finds and migrates data from the medic infodoc', async () => {
      // In legacy situations the transition info was on the doc, while other
      // information was on the infodoc
      const testDoc = {
        data: 'data',
        transitions: {
          some: 'transition info'
        }
      };
      const legacyInfodoc = {
        type: 'info',
        some: 'legacy data',
        initial_replication_date: 1000,
        latest_replication_date: 2000
      };

      await utils.stopSentinel();
      const result = await utils.db.post(testDoc);
      testDoc._rev = result.rev;
      testDoc._id = result.id;

      legacyInfodoc._id = `${result.id}-info`;
      legacyInfodoc.doc_id = result.id;

      await utils.db.put(legacyInfodoc);
      await utils.setTransitionSeqToNow();
      await utils.startSentinel(true);

      testDoc.data = 'data changed';
      await utils.saveDoc(testDoc);

      const [infodoc] = await delayedInfoDocsOf(testDoc._id);

      try {
        await utils.db.get(legacyInfodoc._id);
        assert.fail('doc should be deleted');
      } catch (err) {
        assert.equal(err.status, 404);
      }
      assert.equal(infodoc.initial_replication_date, 1000);
      assert.isOk(infodoc.latest_replication_date !== 2000); // updated
      assert.deepEqual(infodoc.transitions, { some: 'transition info' });
      assert.equal(infodoc.some, 'legacy data');
    });
  });

  describe('transitions infos', () => {
    it('should set correct transition date', async () => {
      const settings = {
        transitions: { generate_shortcode_on_contacts: true }
      };
      await utils.updateSettings(settings, 'sentinel');

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
