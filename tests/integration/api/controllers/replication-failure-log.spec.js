const utils = require('@utils');
const moment = require('moment');
const { CONTACT_TYPES } = require('@medic/constants');
const constants = require('@constants');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');

const password = 'passwordSUP3RS3CR37!';

// Replication requests get a fail-fast abort signal. The success path completes in tens of
// milliseconds, so the timeout doesn't proc. The failure path (nouveau stopped) would otherwise wait
// ~60s for couchdb to give up on its internal nouveau connection — instead we cancel the client
// after ABORT_AFTER_MS, which trips captureReplicationFailures via `res.on('close')` and writes the
// failure log immediately with status_code=0.
const ABORT_AFTER_MS = 2000;
// Time after the client abort to let the failure-log doc settle in couchdb before assertions.
const SETTLE_DELAY_MS = 500;

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
const janicePlace = placeFactory.place().build({
  type: CONTACT_TYPES.HEALTH_CENTER,
  parent: { _id: facility._id },
  place_id: 'shortcode:janiceville'
});
const mathilContact = personFactory.build({
  role: 'chw',
  parent: { _id: mathilPlace._id, parent: { _id: facility._id } },
  name: 'Mathil',
  patient_id: 'shortcode:user:mathil'
});
const janiceContact = personFactory.build({
  role: 'chw',
  parent: { _id: janicePlace._id, parent: { _id: facility._id } },
  name: 'Janice',
  patient_id: 'shortcode:user:janice'
});

const users = [
  userFactory.build({ username: 'mathil', password, place: mathilPlace._id, contact: mathilContact._id, }),
  userFactory.build({ username: 'janice', password, place: janicePlace._id, contact: janiceContact._id, }),
];

// This test depends on stopping Nouveau service in order to fail the replication requests, so we capture how the user
// subject count is stored. In k3d, Nouveau doesn't have its own deployment, it's paired with CouchDb to insure that
// shared storage is always on the same pod.
describe('replication failure logging @docker', () => {
  const getFailureLogId = (username) => `replication-fail-${moment().format('YYYY-MM')}-${username}`;

  const getFailureLogs = ({ user, reportingPeriod, cursor, limit } = {}) => {
    const qs = {};
    if (user) {
      qs.user = user;
    }
    if (reportingPeriod) {
      qs.reporting_period = reportingPeriod;
    }
    if (cursor !== undefined) {
      qs.cursor = cursor;
    }
    if (limit !== undefined) {
      qs.limit = limit;
    }
    return utils.request({ path: '/api/v1/replication-failure-logs', qs });
  };

  const getUserFailureLog = async (username) => {
    const response = await getFailureLogs({ user: username });
    const currentPeriodId = getFailureLogId(username);
    return response.data.find(log => log._id === currentPeriodId) || response.data[0] || null;
  };

  const clearLogs = async () => {
    const result = await utils.logsDb.allDocs({
      include_docs: true,
      startkey: 'replication-fail-',
      endkey: 'replication-fail-\ufff0'
    });

    const purgeDocs = {};
    result.rows.forEach(row => purgeDocs[row.id] = [row.value.rev]);
    await utils.request({
      path: `/${constants.DB_NAME}-logs/_purge`,
      method: 'POST',
      body: purgeDocs
    });
  };

  const requestDocsExpectingError = async (username) => {
    await expect(replicationGetIds(username)).to.be.rejectedWith();
    await utils.delayPromise(SETTLE_DELAY_MS);
  };

  before(async () => {
    await utils.saveDocs([facility, mathilPlace, janicePlace, mathilContact, janiceContact]);
    await utils.createUsers(users, true);
  });

  after(async () => {
    await utils.deleteUsers(users);
    await utils.revertDb();
  });

  afterEach(async () => {
    await clearLogs();
  });

  describe('on successful replication', () => {
    it('should not create a failure log on a successful requests', async () => {
      await replicationGetIds('mathil');
      await replicationGetIds('janice');

      const response = await getFailureLogs();
      expect(response.data).to.deep.equal([]);
      expect(response.cursor).to.be.null;
    });
  });

  describe('on failed replication', () => {
    before(async () => {
      await utils.stopService('nouveau');
    });

    it('should create a failure log when the request fails', async () => {
      await requestDocsExpectingError('mathil');

      const log = await getUserFailureLog('mathil');
      expect(log).to.not.have.property('type');
      expect(log.user).to.equal('mathil');
      expect(log.failures.length).to.eq(1);
      expect(log.failures[0]).to.have.keys(
        'date', 'status_code', 'duration', 'request_id', 'roles', 'subjects_count', 'docs_count', 'unpurged_docs_count'
      );
      // status_code=0 marks "client disconnected before the response was sent" (writableFinished
      // is false). The test client aborts mid-request because nouveau is stopped; see ABORT_AFTER_MS.
      expect(log.failures[0].status_code).to.equal(0);
      expect(log.failures[0].roles).to.be.an('array').that.is.not.empty;
      expect(log.failures[0].subjects_count).to.equal(6);
      // The abort fires while getDocsByReplicationKey is still waiting on the (stopped) nouveau,
      // so docs_count and unpurged_docs_count have not been set yet → 'unknown'.
      expect(log.failures[0].docs_count).to.equal('unknown');
      expect(log.failures[0].unpurged_docs_count).to.equal('unknown');
      expect(log.total_failures).to.equal(1);
    });

    it('should accumulate failures in the same log document', async () => {
      await requestDocsExpectingError('mathil');
      await requestDocsExpectingError('mathil');
      await requestDocsExpectingError('mathil');

      const log = await getUserFailureLog('mathil');
      expect(log.failures).to.be.an('array').that.has.lengthOf(3);
      expect(log.total_failures).to.equal(3);
      log.failures.forEach(failure => {
        expect(failure).to.have.keys(
          'date',
          'status_code',
          'duration',
          'request_id',
          'roles',
          'subjects_count',
          'docs_count',
          'unpurged_docs_count'
        );
        expect(failure.subjects_count).to.equal(6);
        expect(failure.docs_count).to.equal('unknown');
        expect(failure.unpurged_docs_count).to.equal('unknown');
      });
    });

    it('should cap stored failures at 50 and track total count', async () => {
      // Create an initial failure to get a real log doc
      await requestDocsExpectingError('mathil');

      // Seed the log doc with 50 existing failures
      const logId = getFailureLogId('mathil');
      const existentLog = await utils.logsDb.get(logId);
      existentLog.failures = Array.from({ length: 50 }, (_, i) => ({
        date: Date.now() - (50 - i) * 1000,
        status_code: 500,
        duration: 100,
        request_id: `seed-${i}`,
      }));
      existentLog.total_failures = 50;
      await utils.logsDb.put(existentLog);

      await requestDocsExpectingError('mathil');

      const log = await getUserFailureLog('mathil');
      expect(log.failures).to.have.lengthOf(50);
      expect(log.total_failures).to.equal(51);
      expect(log.failures[0].request_id).to.equal('seed-1');
      expect(log.failures[49].request_id).to.not.match(/^seed-/);
    });

    it('should create a new log for the current reporting period even when previous periods exist', async () => {
      const previousPeriods = [
        moment().subtract(1, 'months').format('YYYY-MM'),
        moment().subtract(2, 'months').format('YYYY-MM'),
        moment().subtract(3, 'months').format('YYYY-MM'),
      ];

      for (const period of previousPeriods) {
        await utils.logsDb.put({
          _id: `replication-fail-${period}-mathil`,
          user: 'mathil',
          date: moment(period, 'YYYY-MM').valueOf(),
          total_failures: 0,
          failures: [],
        });
      }

      await requestDocsExpectingError('mathil');

      // New log for the current reporting period
      const currentPeriod = moment().format('YYYY-MM');
      const currentResponse = await getFailureLogs({ user: 'mathil', reportingPeriod: currentPeriod });
      expect(currentResponse.data).to.have.lengthOf(1);
      expect(currentResponse.data[0]._id).to.equal(`replication-fail-${currentPeriod}-mathil`);
      expect(currentResponse.data[0].failures).to.have.lengthOf(1);
      expect(currentResponse.data[0].total_failures).to.equal(1);

      // Previous periods' logs are untouched
      for (const period of previousPeriods) {
        const oldResponse = await getFailureLogs({ user: 'mathil', reportingPeriod: period });
        expect(oldResponse.data).to.have.lengthOf(1);
        expect(oldResponse.data[0].failures).to.have.lengthOf(0);
        expect(oldResponse.data[0].total_failures).to.equal(0);
      }
    });

    it('should return all reporting period logs for a user when no period is provided', async () => {
      const previousPeriods = [
        moment().subtract(1, 'months').format('YYYY-MM'),
        moment().subtract(2, 'months').format('YYYY-MM'),
      ];

      for (const period of previousPeriods) {
        await utils.logsDb.put({
          _id: `replication-fail-${period}-mathil`,
          user: 'mathil',
          date: moment(period, 'YYYY-MM').valueOf(),
          total_failures: 3,
          failures: [
            { date: 1, status_code: 500, duration: 10, request_id: `${period}-a` },
          ],
        });
      }

      await requestDocsExpectingError('mathil');

      const { data } = await getFailureLogs({ user: 'mathil' });
      const ids = data.map(log => log._id).sort();
      expect(ids).to.include(`replication-fail-${moment().format('YYYY-MM')}-mathil`);
      for (const period of previousPeriods) {
        expect(ids).to.include(`replication-fail-${period}-mathil`);
      }
      data.forEach(log => {
        expect(log).to.not.have.property('type');
        expect(log.user).to.equal('mathil');
        expect(log.failures).to.be.an('array');
      });
    });

    it('should return full bodies for all users when no filters are provided', async () => {
      await requestDocsExpectingError('mathil');
      await requestDocsExpectingError('janice');

      const response = await getFailureLogs();
      expect(response.data.length).to.be.at.least(2);

      const mathilLog = response.data.find(log => log.user === 'mathil');
      expect(mathilLog.failures).to.have.lengthOf(1);
      expect(mathilLog.total_failures).to.equal(1);

      const janiceLog = response.data.find(log => log.user === 'janice');
      expect(janiceLog.failures).to.have.lengthOf(1);
      expect(janiceLog.total_failures).to.equal(1);

      expect(mathilLog._id).to.not.equal(janiceLog._id);
    });

    it('should respect the limit parameter and return a next-page cursor', async () => {
      await requestDocsExpectingError('mathil');
      await requestDocsExpectingError('janice');

      const response = await getFailureLogs({ limit: 1 });
      expect(response.data).to.have.lengthOf(1);
      expect(response.cursor).to.not.be.null;
    });

    it('should walk pages via the returned cursor', async () => {
      await requestDocsExpectingError('mathil');
      await requestDocsExpectingError('janice');

      const firstPage = await getFailureLogs({ limit: 1 });
      expect(firstPage.data).to.have.lengthOf(1);
      expect(firstPage.cursor).to.not.be.null;

      const secondPage = await getFailureLogs({ cursor: firstPage.cursor, limit: 1 });
      expect(secondPage.data).to.have.lengthOf(1);
      // Last page → no more data
      expect(secondPage.cursor).to.be.null;

      expect(firstPage.data[0]._id).to.not.equal(secondPage.data[0]._id);
    });

    it('should return an empty list when filtering by a non-existing user', async () => {
      const response = await getFailureLogs({ user: 'nobody-here' });
      expect(response.data).to.deep.equal([]);
      expect(response.cursor).to.be.null;
    });

    it('should return an empty list when filtering by user and a reporting period with no failures', async () => {
      const period = moment().format('YYYY-MM');
      const response = await getFailureLogs({ user: 'nobody-here', reportingPeriod: period });
      expect(response.data).to.deep.equal([]);
      expect(response.cursor).to.be.null;
    });

    after(async () => {
      await utils.startService('nouveau');
    });
  });
});
