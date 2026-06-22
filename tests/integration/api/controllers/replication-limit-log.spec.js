const utils = require('@utils');

const DOC_IDS_WARN_LIMIT = 10000;

const countLog = (user, count) => ({
  _id: `replication-count-${user}`,
  user,
  date: 1700000000000,
  count,
  all_docs_count: count,
});

const getDocCount = (qs = {}) => utils.request({ path: '/api/v1/users-doc-count', qs });

describe('users doc count', () => {
  before(() => utils.deleteLogsByPrefix('replication-count-'));

  afterEach(() => utils.deleteLogsByPrefix('replication-count-'));

  it('should return the configured limit and a log for every user', async () => {
    await utils.logsDb.put(countLog('alice', 50));
    await utils.logsDb.put(countLog('bob', 200));

    const response = await getDocCount();

    expect(response.limit).to.equal(DOC_IDS_WARN_LIMIT);
    const summary = response.users
      .map(log => ({ user: log.user, count: log.count, all_docs_count: log.all_docs_count }));
    expect(summary).to.have.deep.members([
      { user: 'alice', count: 50, all_docs_count: 50 },
      { user: 'bob', count: 200, all_docs_count: 200 },
    ]);
  });

  it('should return only the requested user when filtered by user', async () => {
    await utils.logsDb.put(countLog('alice', 50));
    await utils.logsDb.put(countLog('bob', 200));

    const response = await getDocCount({ user: 'bob' });

    expect(response.limit).to.equal(DOC_IDS_WARN_LIMIT);
    // When filtered, `users` is the single matching log document rather than an array.
    expect(response.users._id).to.equal('replication-count-bob');
    expect(response.users.user).to.equal('bob');
    expect(response.users.count).to.equal(200);
  });

  it('should return an empty list when no users have replicated', async () => {
    const response = await getDocCount();

    expect(response).to.deep.equal({ limit: DOC_IDS_WARN_LIMIT, users: [] });
  });

  it('should 404 when filtering by a user that has no log', async () => {
    await expect(getDocCount({ user: 'nobody-here' })).to.be.rejected
      .and.eventually.have.property('status', 404);
  });
});
