const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const chai = require('chai');
const uuid = require('uuid');

const docToKeep = { _id: uuid() };
const docToDelete = { _id: uuid() };

const user = {
  username: 'bgcu',
  password: 'hunter2-is-not-long-enough',
  roles: ['national_admin'],
};

const userReadDocs = [
  { _id: `read:report:${docToKeep._id}`},
  { _id: `read:report:${docToDelete._id}`},
];

describe('Background cleanup', () => {
  afterEach(() => utils.revertDb().then(() => utils.deleteUsers([user], true)));

  it('processes a batch of outstanding deletes ', () => {
    // Create then delete a doc
    return Promise.resolve()
      .then(() => utils.saveDocs([docToDelete, docToKeep]))
      .then(() => sentinelUtils.waitForSentinel(docToDelete._id))
      // Setup some read docs
      .then(() => utils.createUsers([user], true))
      .then(() => utils.requestOnTestMetaDb({
        userName: user.username,
        path: '/_bulk_docs',
        method: 'POST',
        body: {docs: userReadDocs}
      }, true))
      // Delete while stopped
      .then(() => utils.stopSentinel())
      .then(() => utils.deleteDoc(docToDelete._id))
      // Boot up sentinel again and let the background cleanup finish
      .then(() => utils.startSentinel())
      .then(() => sentinelUtils.waitForBackgroundCleanup())
      // Check infodoc deletion
      .then(() => utils.sentinelDb.allDocs({
        keys: [`${docToKeep._id}-info`, `${docToDelete._id}-info`],
        include_docs: true
      }))
      .then(result => {
        chai.expect(result.rows.length).to.equal(2);
        chai.expect(result.rows[0].id).to.equal(`${docToKeep._id}-info`);
        chai.expect(result.rows[0].doc._id).to.equal(`${docToKeep._id}-info`);

        chai.expect(result.rows[1].id).to.equal(`${docToDelete._id}-info`);
        chai.expect(result.rows[1].value.deleted).to.equal(true);
      })
      // Check read receipt deletion
      .then(() => utils.requestOnTestMetaDb({
        userName: user.username,
        path: '/_all_docs',
        method: 'POST',
        body: {keys: userReadDocs.map(d => d._id)}
      }))
      .then(result => {
        chai.expect(result.rows.length).to.equal(2);

        chai.expect(result.rows[0].id).to.equal(userReadDocs[0]._id);

        chai.expect(result.rows[1].id).to.equal(userReadDocs[1]._id);
        chai.expect(result.rows[1].value.deleted).to.equal(true);
      });
  });
});
