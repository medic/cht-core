const sinon = require('sinon');
const { expect } = require('chai');

const { RetryableError } = require('../../../../src/lib/bulk-operations/errors');
const { writeDocs } = require('../../../../src/lib/bulk-operations/write');

describe('bulk-operations write', () => {
  const docs = [ { _id: 'a' }, { _id: 'b' } ];
  let database;

  beforeEach(() => {
    database = { bulkDocs: sinon.stub() };
  });

  afterEach(() => sinon.restore());

  it('writes the docs and reports nothing when every row succeeded', async () => {
    database.bulkDocs.resolves([ { ok: true, id: 'a' }, { ok: true, id: 'b' } ]);

    expect(await writeDocs(database, docs, 'writing')).to.deep.equal([]);
    expect(database.bulkDocs.calledOnceWithExactly(docs)).to.equal(true);
  });

  it('raises when a row lost to a concurrent edit, so the batch is run again', async () => {
    database.bulkDocs.resolves([ { ok: true, id: 'a' }, { id: 'b', error: 'conflict' } ]);

    const err = await writeDocs(database, docs, 'writing').catch(e => e);

    expect(err).to.be.an.instanceOf(RetryableError);
    expect(err.message).to.equal('writing lost 1 doc(s) to a concurrent edit');
  });

  it('hands back the rows that failed for good, which running it again will not fix', async () => {
    database.bulkDocs.resolves([ { ok: true, id: 'a' }, { id: 'b', error: 'forbidden' } ]);

    expect(await writeDocs(database, docs, 'writing')).to.deep.equal([ { id: 'b', error: 'forbidden' } ]);
  });

  it('prefers the conflict, so one lost race is not recorded as a permanent failure', async () => {
    database.bulkDocs.resolves([ { id: 'a', error: 'forbidden' }, { id: 'b', error: 'conflict' } ]);

    await expect(writeDocs(database, docs, 'writing')).to.be.rejectedWith(RetryableError);
  });

  it('lets a rejected write through, for the caller to classify', async () => {
    database.bulkDocs.rejects(Object.assign(new Error('couch down'), { status: 503 }));

    await expect(writeDocs(database, docs, 'writing')).to.be.rejectedWith('couch down');
  });
});
