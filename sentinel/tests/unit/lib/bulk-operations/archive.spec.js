const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../../src/db');
const archivingUtils = require('@medic/archiving-utils');
const { PREFIXES } = require('@medic/constants');
const { archive } = require('../../../../src/lib/bulk-operations/archive');

describe('bulk-operations archive handler', () => {
  afterEach(() => sinon.restore());

  it('queues a single archive job holding the batch ids and returns no failures', async () => {
    const put = sinon.stub(db.sentinel, 'put').resolves();

    const failed = await archive([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed).to.deep.equal([]);
    expect(put.calledOnce).to.equal(true);
    const job = put.args[0][0];
    expect(job._id.startsWith(PREFIXES.ARCHIVE_JOB)).to.equal(true);
    expect(job.type).to.equal(PREFIXES.ARCHIVE_JOB);
    expect(job.total).to.equal(2);
    expect(job.cursor).to.equal(0);
    const decoded = archivingUtils.decodeIds(job._attachments[archivingUtils.ATTACHMENT_NAME].data);
    expect(decoded).to.deep.equal([ 'a', 'b' ]);
  });

  it('fails an operation with no id and does not include it in the job', async () => {
    const put = sinon.stub(db.sentinel, 'put').resolves();

    const failed = await archive([ { id: 'a' }, {} ], 'action-1');

    expect(failed).to.have.length(1);
    const decoded = archivingUtils.decodeIds(put.args[0][0]._attachments[archivingUtils.ATTACHMENT_NAME].data);
    expect(decoded).to.deep.equal([ 'a' ]);
  });

  it('does not write a job when the batch has no ids', async () => {
    const put = sinon.stub(db.sentinel, 'put').resolves();

    const failed = await archive([ {} ], 'action-1');

    expect(failed).to.have.length(1);
    expect(put.called).to.equal(false);
  });

  it('fails the whole batch when the job cannot be written', async () => {
    sinon.stub(db.sentinel, 'put').rejects(new Error('boom'));

    const failed = await archive([ { id: 'a' }, { id: 'b' } ], 'action-1');

    expect(failed.map(op => op.id)).to.deep.equal([ 'a', 'b' ]);
  });
});
