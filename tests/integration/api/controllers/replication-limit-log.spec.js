const utils = require('@utils');
const { CONTACT_TYPES } = require('@medic/constants');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');

const DOC_IDS_WARN_LIMIT = 10000;

const countLog = (user, count) => ({
  _id: `replication-count-${user}`,
  user,
  date: 1700000000000,
  count,
  all_docs_count: count,
});

const password = 'passwordSUP3RS3CR37!';
const offlineFacility = placeFactory.place().build({ type: CONTACT_TYPES.DISTRICT_HOSPITAL });
const offlinePlace = placeFactory.place().build({
  type: CONTACT_TYPES.HEALTH_CENTER,
  parent: { _id: offlineFacility._id },
  place_id: 'shortcode:dc-offlineville',
});
const offlineContact = personFactory.build({
  role: 'chw',
  parent: { _id: offlinePlace._id, parent: { _id: offlineFacility._id } },
  name: 'Offline',
  patient_id: 'shortcode:user:dc-offline',
});
const offlineUser = userFactory.build({
  username: 'dc-offline-user',
  password,
  place: offlinePlace._id,
  contact: offlineContact._id,
});

const getDocCount = (qs = {}) => utils.request({ path: '/api/v1/users-doc-count', qs });

describe('users doc count', () => {
  before(async () => {
    await utils.deleteLogsByPrefix('replication-count-');
    await utils.saveDocs([offlineFacility, offlinePlace, offlineContact]);
    await utils.createUsers([offlineUser], true);
  });

  afterEach(() => utils.deleteLogsByPrefix('replication-count-'));

  after(async () => {
    await utils.deleteUsers([offlineUser], true);
    await utils.revertDb();
  });

  it('should reject a non-admin user with a 401', async () => {
    await expect(utils.request({
      path: '/api/v1/users-doc-count',
      auth: { username: offlineUser.username, password },
    })).to.be.rejected.and.eventually.have.property('status', 401);
  });

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
