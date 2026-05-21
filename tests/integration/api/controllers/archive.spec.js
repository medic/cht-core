const utils = require('@utils');

const ID_PREFIX = 'archive:';

const postCsv = (csv, opts = {}) => utils.request({
  path: '/api/v1/archive',
  method: 'POST',
  body: csv,
  headers: { 'Content-Type': 'text/csv' },
  ...opts,
});

const listJobs = () => utils.sentinelDb.allDocs({
  startkey: ID_PREFIX,
  endkey: `${ID_PREFIX}\ufff0`,
});

const cleanupJobs = async () => {
  const result = await listJobs();
  if (!result.rows.length) {
    return;
  }
  await utils.sentinelDb.bulkDocs(result.rows.map(row => ({
    _id: row.id,
    _rev: row.value.rev,
    _deleted: true,
  })));
};

describe('POST /api/v1/archive', () => {
  afterEach(async () => {
    await cleanupJobs();
  });

  it('creates a job doc in the sentinel db with the ids stored as an attachment', async () => {
    const csv = ['doc-a', 'doc-b', 'doc-c'].join('\n');
    const response = await postCsv(csv);

    expect(response.jobs).to.have.lengthOf(1);
    expect(response.jobs[0]).to.have.keys('id', 'count');
    expect(response.jobs[0].count).to.equal(3);
    expect(response.jobs[0].id).to.match(/^archive:/);

    const doc = await utils.sentinelDb.get(response.jobs[0].id);
    expect(doc).to.include({ type: 'archive:', total: 3, cursor: 0 });
    expect(doc).to.not.have.property('status');
    expect(doc).to.have.property('date');
    expect(doc._attachments.ids.content_type).to.equal('text/plain');

    const attachment = await utils.sentinelDb.getAttachment(response.jobs[0].id, 'ids');
    expect(attachment.toString('utf8')).to.equal('doc-a\ndoc-b\ndoc-c');
  });

  it('skips blank lines and strips surrounding double quotes', async () => {
    const csv = ['', '"doc-1"', '  doc-2  ', ''].join('\n');
    const response = await postCsv(csv);

    expect(response.jobs[0].count).to.equal(2);
    const attachment = await utils.sentinelDb.getAttachment(response.jobs[0].id, 'ids');
    expect(attachment.toString('utf8')).to.equal('doc-1\ndoc-2');
  });

  it('rejects a body of only whitespace with 400', async () => {
    let err;
    try {
      await postCsv('   \n   \n');
    } catch (caught) {
      err = caught;
    }
    expect(err, 'expected request to be rejected').to.exist;
    expect(err.status).to.equal(400);
    expect(err.body).to.deep.match(/no doc ids/i);

    const list = await listJobs();
    expect(list.rows).to.have.lengthOf(0);
  });

  it('rejects an empty body with 400', async () => {
    let err;
    try {
      await postCsv('');
    } catch (caught) {
      err = caught;
    }
    expect(err, 'expected request to be rejected').to.exist;
    expect(err.status).to.equal(400);

    const list = await listJobs();
    expect(list.rows).to.have.lengthOf(0);
  });

  it('rejects a non-text/csv content-type with 415', async () => {
    let err;
    try {
      await utils.request({
        path: '/api/v1/archive',
        method: 'POST',
        body: { ids: ['doc-a', 'doc-b'] },
      });
    } catch (caught) {
      err = caught;
    }
    expect(err, 'expected request to be rejected').to.exist;
    expect(err.status).to.equal(415);
    expect(err.body).to.deep.include({ code: 415 });

    const list = await listJobs();
    expect(list.rows).to.have.lengthOf(0);
  });

  it('splits an upload that exceeds MAX_IDS_PER_JOB into multiple job docs', async function () {
    this.timeout(60000);

    const MAX = 100000;
    const overflow = 5;
    const total = MAX + overflow;
    const lines = [];
    for (let i = 0; i < total; i++) {
      lines.push(`doc-${i}`);
    }
    const csv = lines.join('\n');

    const response = await postCsv(csv);

    expect(response.jobs).to.have.lengthOf(2);
    expect(response.jobs.map(j => j.count)).to.deep.equal([MAX, overflow]);
    expect(response.jobs[0].id).to.not.equal(response.jobs[1].id);

    const [first, second] = await Promise.all(
      response.jobs.map(j => utils.sentinelDb.get(j.id))
    );
    expect(first.total).to.equal(MAX);
    expect(second.total).to.equal(overflow);

    const secondAttachment = await utils.sentinelDb.getAttachment(response.jobs[1].id, 'ids');
    const tailIds = secondAttachment.toString('utf8').split('\n');
    expect(tailIds).to.have.lengthOf(overflow);
    expect(tailIds[0]).to.equal(`doc-${MAX}`);
    expect(tailIds[overflow - 1]).to.equal(`doc-${total - 1}`);
  });
});
