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
    console.log('CHECKPOINT # 1');
    await sentinelUtils.waitForSentinel(docToDelete._id);
    console.log('CHECKPOINT # 2');

    // Setup some read docs
    await utils.createUsers([user], true);
    console.log('CHECKPOINT # 3');
    await utils.requestOnTestMetaDb({
      userName: user.username,
      path: '/_bulk_docs',
      method: 'POST',
      body: {docs: userReadDocs}
    });
    console.log('CHECKPOINT # 4');
    // Delete while stopped
    await utils.stopSentinel();
    console.log('CHECKPOINT # 5');
    await utils.deleteDoc(docToDelete._id);
    console.log('CHECKPOINT # 6');
    // Boot up sentinel again and let the background cleanup finish
    await utils.startSentinel();
    console.log('CHECKPOINT # 7');
    await sentinelUtils.waitForBackgroundCleanup();
    console.log('CHECKPOINT # 8');
    // Check infodoc deletion
    const infodocs = await utils.sentinelDb.allDocs({
      keys: [`${docToKeep._id}-info`, `${docToDelete._id}-info`],
      include_docs: true
    });
    console.log('CHECKPOINT # 9');
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
    console.log('CHECKPOINT # 10');
    expect(userDocs.rows).to.have.lengthOf(2);
    expect(userDocs.rows[0].id).to.equal(userReadDocs[0]._id);
    expect(userDocs.rows[1].id).to.equal(userReadDocs[1]._id);
    expect(userDocs.rows[1].value.deleted).to.be.true;
  });
});
