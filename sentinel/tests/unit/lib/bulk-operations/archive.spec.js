const sinon = require('sinon');
const { expect } = require('chai');

const archiving = require('../../../../src/lib/archiving');
const { archive } = require('../../../../src/lib/bulk-operations/archive');

describe('bulk-operations archive handler', () => {
  let archiveBatch;

  beforeEach(() => {
    archiveBatch = sinon.stub(archiving, 'archiveBatch');
  });

  afterEach(() => sinon.restore());

  it('archives the batch ids and returns no failures', async () => {
    archiveBatch.resolves();

    const failed = await archive([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(archiveBatch.calledOnceWithExactly([ 'a', 'b' ])).to.equal(true);
  });

  it('fails an operation with no id and archives only the rest', async () => {
    archiveBatch.resolves();

    const failed = await archive([ { id: 'a' }, {} ], 'action-1');

    expect(failed).to.have.length(1);
    expect(archiveBatch.calledOnceWithExactly([ 'a' ])).to.equal(true);
  });

  it('does not archive when the batch has no ids', async () => {
    const failed = await archive([ {} ], 'action-1');

    expect(failed).to.have.length(1);
    expect(archiveBatch.called).to.equal(false);
  });

  it('fails the whole batch when archiving throws', async () => {
    archiveBatch.rejects(new Error('boom'));

    const failed = await archive([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed.map(op => op.id)).to.deep.equal([ 'a', 'b' ]);
  });
});
