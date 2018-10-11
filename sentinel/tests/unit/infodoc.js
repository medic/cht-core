const assert = require('chai').assert,
  sinon = require('sinon').sandbox.create(),
  db = require('../../../src/db-pouch'),
  infodoc = require('../../../src/lib/infodoc');

describe('infodoc', () => {
  afterEach(() => sinon.restore());

  it('gets infodoc from medic and moves it to sentinel', () => {
    const change = { id: 'messages-en' };
    const rev = '123';
    const info = { _id: 'messages-en-info', _rev: rev, transitions: [] };

    const getSentinelInfo = sinon.stub(db.sentinel, 'get').resolves(null);
    const getMedicInfo = sinon.stub(db.medic, 'get').resolves(info);
    const removeLegacyInfo = sinon.stub(db.medic, 'remove').resolves(info);
    const updateSentinelInfo = sinon.stub(db.sentinel, 'put').resolves({});

    return infodoc.get(change).then(() => {
      assert(getSentinelInfo.calledOnce);
      assert.equal(getSentinelInfo.args[0], info._id);
      assert(getMedicInfo.calledOnce);
      assert.equal(getMedicInfo.args[0], info._id);
      assert(removeLegacyInfo.calledOnce);
      assert.deepEqual(removeLegacyInfo.args[0], [info._id, rev]);
      assert.equal(updateSentinelInfo.args[0][0]._id, info._id);
      assert(!updateSentinelInfo.args[0][0]._rev);
      assert.deepEqual(updateSentinelInfo.args[0][0].transitions, []);
    });
  });
});
