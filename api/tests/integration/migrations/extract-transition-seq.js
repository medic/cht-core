const { assert } = require('chai');

const utils = require('./utils');
const db = require('../../../src/db');

const TRANSITION_SEQ_DOCUMENT = '_local/transitions-seq';
const BACKGROUND_CLEANUP_SEQ_DOCUMENT = '_local/background-seq';
const METADATA_DOCUMENT = '_local/sentinel-meta-data';
const OLD_METADATA_DOCUMENT = 'sentinel-meta-data';
const MIGRATION = 'extract-transition-seq';

describe(`${MIGRATION} migration`, function() {
  before(async () => utils.initDb([]));
  after(async () => utils.tearDown());

  const wipe = (dbRef, docName) => {
    return dbRef.get(docName)
      .then(doc => {
        doc._deleted = true;
        return dbRef.put(doc);
      })
      .catch(() => {});
  };

  it('works correctly on an empty db', () => {
    return wipe(db.sentinel, METADATA_DOCUMENT)
      .then(() => utils.runMigration(MIGRATION))
      .then(() => db.sentinel.get(TRANSITION_SEQ_DOCUMENT))
      .then(doc => {
        assert.equal(doc.value, 0);
      })
      .then(() => db.sentinel.get(BACKGROUND_CLEANUP_SEQ_DOCUMENT))
      .then(doc => {
        assert.equal(doc.value, 0);
      });
  });

  it('works on old doc name on medic db', () => {
    return Promise.all([
      wipe(db.sentinel, METADATA_DOCUMENT),
      wipe(db.medic, OLD_METADATA_DOCUMENT)
    ])
      .then(() => db.medic.put({
        _id: OLD_METADATA_DOCUMENT,
        processed_seq: '1'
      }))
      .then(() => utils.runMigration(MIGRATION))
      .then(() => db.sentinel.get(TRANSITION_SEQ_DOCUMENT))
      .then(doc => {
        assert.equal(doc.value, 1);
      })
      .then(() => db.sentinel.get(BACKGROUND_CLEANUP_SEQ_DOCUMENT))
      .then(doc => {
        assert.equal(doc.value, 1);
      });
  });

  it('works on new doc name on medic db', () => {
    return Promise.all([
      wipe(db.sentinel, METADATA_DOCUMENT),
      wipe(db.medic, METADATA_DOCUMENT)
    ])
      .then(() => db.medic.put({
        _id: METADATA_DOCUMENT,
        processed_seq: '2'
      }))
      .then(() => utils.runMigration(MIGRATION))
      .then(() => db.sentinel.get(TRANSITION_SEQ_DOCUMENT))
      .then(doc => {
        assert.equal(doc.value, 2);
      })
      .then(() => db.sentinel.get(BACKGROUND_CLEANUP_SEQ_DOCUMENT))
      .then(doc => {
        assert.equal(doc.value, 2);
      });
  });
});
