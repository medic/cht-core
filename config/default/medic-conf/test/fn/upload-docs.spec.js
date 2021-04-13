const { expect, assert } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const api = require('../api-stub');
const uploadDocs = rewire('../../src/fn/upload-docs');
const userPrompt = rewire('../../src/lib/user-prompt');
let readLine = { keyInYN: () => true };
userPrompt.__set__('readline', readLine);
uploadDocs.__set__('userPrompt', userPrompt);

describe('upload-docs', function() {
  let fs;

  beforeEach(() => {
    api.start();
    fs = {
      exists: () => true,
      recurseFiles: () => ['one.doc.json', 'two.doc.json', 'three.doc.json'],
      writeJson: () => {},
      readJson: name => ({ _id: name.substring(0, name.length - '.doc.json'.length) }),
    };
    uploadDocs.__set__('fs', fs);
  });
  afterEach(() => {
    sinon.restore();
    return api.stop();
  });

  it('should upload docs to pouch', async () => {
    await assertDbEmpty();
    await uploadDocs.execute();
    const res = await api.db.allDocs();

    expect(res.rows.map(doc => doc.id)).to.deep.eq(['one', 'three', 'two']);
  });

  it('do nothing if there are no docs to upload', async () => {
    await assertDbEmpty();

    const pouch = sinon.stub();
    fs.recurseFiles = () => [];
    return uploadDocs.__with__({ fs, pouch })(async () => {
      await uploadDocs.execute();
      expect(pouch.called).to.be.false;
    });
  });

  it('throw if doc id differs from filename', async () => {
    await assertDbEmpty();
    const pouch = sinon.stub();
    fs.recurseFiles = () => [`1.doc.json`];
    fs.readJson = () => ({ _id: 'not_1' });

    return uploadDocs.__with__({ fs, pouch })(async () => {
      try {
        await uploadDocs.execute();
        expect.fail('should throw');
      } catch (err) {
        expect(err.message).to.include('expected _id is');
      }
    });
  });

  it('should retry in batches', async () => {
    const bulkDocs = sinon.stub()
      .onCall(0).throws({ error: 'timeout' })
      .returns(Promise.resolve([{}]));
    fs.recurseFiles = () => new Array(10).fill('').map((x, i) => `${i}.doc.json`);
    sinon.useFakeTimers(0);

    const imported_date = new Date(0).toISOString();
    return uploadDocs.__with__({
      INITIAL_BATCH_SIZE: 4,
      fs,
      pouch: () => ({ bulkDocs }),
    })(async () => {
      await uploadDocs.execute();
      expect(bulkDocs.callCount).to.eq(1 + 10 / 2);

      // first failed batch of 4
      expect(bulkDocs.args[0][0]).to.deep.eq([
        { _id: '0', imported_date },
        { _id: '1', imported_date },
        { _id: '2', imported_date },
        { _id: '3', imported_date }
      ]);

      // retry batch of 2
      expect(bulkDocs.args[1][0]).to.deep.eq([
        { _id: '0', imported_date },
        { _id: '1', imported_date },
      ]);

      // move on to next with batch size 2
      expect(bulkDocs.args[2][0]).to.deep.eq([
        { _id: '2', imported_date },
        { _id: '3', imported_date  },
      ]);
    });
  });

  it('should exit if user denies the warning', async () => {
    userPrompt.__set__('readline', { keyInYN: () => false });
    await assertDbEmpty();
    sinon.stub(process, 'exit');
    await uploadDocs.execute().then(() => {
      assert.equal(process.exit.callCount, 1);
    });
  });

  it('should not exit if force is set', async () => {
    userPrompt.__set__('environment', { force: () => true });
    await assertDbEmpty();
    sinon.stub(process, 'exit');
    await uploadDocs.execute();
    assert.equal(process.exit.callCount, 0);
    const res = await api.db.allDocs();
    expect(res.rows.map(doc => doc.id)).to.deep.eq(['one', 'three', 'two']);
  });
});

async function assertDbEmpty() {
  const res = await api.db.allDocs();
  expect(res.rows).to.be.empty;
}
