const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const { expect } = require('chai');
const uuid = require('uuid').v4;

const docToKeep = { _id: uuid() };
const docToDelete = { _id: uuid() };

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hospital',
};

const user = {
  username: 'bruce',
  password: 'Nananana_b4tm4n!',
  place: {
    _id: 'fixture:online',
    type: 'health_center',
    name: 'Online place',
    parent: 'PARENT_PLACE',
  },
  contact: {
    _id: 'fixture:user:bruce',
    name: 'Bruce',
  },
  roles: ['national_admin'],
};

const userReadDocs = [
  { _id: `read:report:${docToKeep._id}`},
  { _id: `read:report:${docToDelete._id}`},
];

describe('Background cleanup', () => {
  afterEach(() => utils.revertDb([], true).then(() => utils.deleteUsers([user], true)));

  it('processes a batch of outstanding deletes ', async () => {
    // Create then delete a doc
    await utils.saveDocs([parentPlace, docToDelete, docToKeep]);
    await sentinelUtils.waitForSentinel(docToDelete._id);

    // Setup some read docs
    await utils.createUsers([user], true);
    await utils.requestOnTestMetaDb({
      userName: user.username,
      path: '/_bulk_docs',
      method: 'POST',
      body: {docs: userReadDocs}
    });

    // Delete while stopped
    await utils.stopSentinel();
    await utils.deleteDoc(docToDelete._id);

    // Boot up sentinel again and let the background cleanup finish
    await utils.startSentinel();
    await sentinelUtils.waitForBackgroundCleanup();

    // Check infodoc deletion
    const infodocs = await utils.sentinelDb.allDocs({
      keys: [`${docToKeep._id}-info`, `${docToDelete._id}-info`],
      include_docs: true
    });

    expect(infodocs.rows).to.have.lengthOf(2);
    expect(infodocs.rows[0].id).to.equal(`${docToKeep._id}-info`);
    expect(infodocs.rows[0].doc._id).to.equal(`${docToKeep._id}-info`);
    expect(infodocs.rows[1].id).to.equal(`${docToDelete._id}-info`);
    expect(infodocs.rows[1].value.deleted).to.be.true;

    // Check read receipt deletion
    const userDocs = await utils.requestOnTestMetaDb({
      userName: user.username,
      path: '/_all_docs',
      method: 'POST',
      body: {keys: userReadDocs.map(d => d._id)}
    });

    expect(userDocs.rows).to.have.lengthOf(2);
    expect(userDocs.rows[0].id).to.equal(userReadDocs[0]._id);
    expect(userDocs.rows[1].id).to.equal(userReadDocs[1]._id);
    expect(userDocs.rows[1].value.deleted).to.be.true;
  });
});
