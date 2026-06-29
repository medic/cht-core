const utils = require('@utils');
const { CONTACT_TYPES } = require('@medic/constants');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');

const password = 'passwordSUP3RS3CR37!';

// Abort the client well before couchdb gives up on its (stopped) nouveau connection.
const ABORT_AFTER_MS = 2000;
// couchdb waits up to ~60s for nouveau, so the stray server-side chain can resolve any time within
// that window after nouveau is restarted. Poll long enough to be sure the count was never written.
const WATCH_MS = 65000;
const POLL_INTERVAL_MS = 2000;

const replicationGetIds = (username) => utils.request({
  path: '/api/v1/replication/get-ids',
  auth: { username, password },
  signal: AbortSignal.timeout(ABORT_AFTER_MS),
});

const facility = placeFactory.place().build({ type: CONTACT_TYPES.DISTRICT_HOSPITAL });
const mathilPlace = placeFactory.place().build({
  type: CONTACT_TYPES.HEALTH_CENTER,
  parent: { _id: facility._id },
  place_id: 'shortcode:mathilville'
});
const mathilContact = personFactory.build({
  role: 'chw',
  parent: { _id: mathilPlace._id, parent: { _id: facility._id } },
  name: 'Mathil',
  patient_id: 'shortcode:user:mathil'
});
const mathilUser = userFactory.build({
  username: 'mathil', password, place: mathilPlace._id, contact: mathilContact._id,
});

const countLogId = (username) => `replication-count-${username}`;

const hasCountLog = async (username) => {
  try {
    await utils.logsDb.get(countLogId(username));
    return true;
  } catch (err) {
    if (err.status === 404) {
      return false;
    }
    throw err;
  }
};

// this test is ignored in CI, due to a 60s required wait period
// to run this test, run the wdio replication suite locally.
describe('replication limit log on aborted requests @docker', () => {
  before(async () => {
    await utils.saveDocs([facility, mathilPlace, mathilContact]);
    await utils.createUsers([mathilUser], true);
    await utils.deleteLogsByPrefix('replication-count-');
  });

  afterEach(() => utils.deleteLogsByPrefix('replication-count-'));

  after(async () => {
    await utils.deleteUsers([mathilUser]);
    await utils.revertDb();
  });

  it('should not register a doc count when the client aborts the request', async () => {
    await utils.stopService('nouveau');
    // The client gives up while couchdb is still waiting on nouveau.
    await expect(replicationGetIds('mathil')).to.be.rejectedWith();
    // Bring nouveau back so the un-cancelled server-side chain resolves and would write the log.
    await utils.startService('nouveau');

    const deadline = Date.now() + WATCH_MS;
    while (Date.now() < deadline) {
      // Fail fast on the regression: the guard is missing if the count ever lands.
      expect(await hasCountLog('mathil')).to.equal(false);
      await utils.delayPromise(POLL_INTERVAL_MS);
    }
  });
});
