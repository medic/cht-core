const utils = require('@utils');
const moment = require('moment');
const { CONTACT_TYPES } = require('@medic/constants');
const constants = require('@constants');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');

const password = 'passwordSUP3RS3CR37!';

const replicationGetIds = (username) => {
  const options = {
    path: '/api/v1/replication/get-ids',
    auth: { username, password }
  };
  return utils.request(options);
};

const facility = placeFactory.place().build({ type: CONTACT_TYPES.DISTRICT_HOSPITAL });
const bobPlace = placeFactory.place().build({
  type: CONTACT_TYPES.HEALTH_CENTER,
  parent: { _id: facility._id },
  place_id: 'shortcode:bobville'
});
const clarePlace = placeFactory.place().build({
  type: CONTACT_TYPES.HEALTH_CENTER,
  parent: { _id: facility._id },
  place_id: 'shortcode:clareville'
});
const bobContact = personFactory.build({
  role: 'chw',
  parent: { _id: bobPlace._id, parent: { _id: facility._id } },
  name: 'Bob',
  patient_id: 'shortcode:user:bob'
});
const clareContact = personFactory.build({
  role: 'chw',
  parent: { _id: clarePlace._id, parent: { _id: facility._id } },
  name: 'Clare',
  patient_id: 'shortcode:user:clare'
});

const users = [
  userFactory.build({ username: 'bob', password, place: bobPlace._id, contact: bobContact._id, roles: ['chw'] }),
  userFactory.build({ username: 'clare', password, place: clarePlace._id, contact: clareContact._id, roles: ['chw'] }),
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
    await utils.delayPromise(100); // wait for doc to be written
  };

  before(async () => {
    await utils.saveDocs([facility, bobPlace, clarePlace, bobContact, clareContact]);
    await utils.createUsers(users, true);
  });

  afterEach(async () => {
    await clearLogs();
  });

  describe('on successful replication', () => {
    it('should not create a failure log on a successful requests', async () => {
      await replicationGetIds('bob');
      await replicationGetIds('clare');

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
      await requestDocsExpectingError('bob');

      const log = await getUserFailureLog('bob');
      expect(log).to.not.have.property('type');
      expect(log.user).to.equal('bob');
      expect(log.failures.length).to.eq(1);
      expect(log.failures[0]).to.have.keys(
        'date', 'status_code', 'duration', 'request_id', 'roles', 'subjects_count', 'docs_count', 'unpurged_docs_count'
      );
      expect(log.failures[0].status_code).to.be.at.least(400);
      expect(log.failures[0].roles).to.be.an('array').that.is.not.empty;
      expect(log.failures[0].subjects_count).to.equal(6);
      // nouveau is stopped, so getDocsByReplicationKey throws before docs_count and
      // unpurged_docs_count are computed; they fall back to 'unknown'.
      expect(log.failures[0].docs_count).to.equal('unknown');
      expect(log.failures[0].unpurged_docs_count).to.equal('unknown');
      expect(log.total_failures).to.equal(1);
    });

    it('should accumulate failures in the same log document', async () => {
      await requestDocsExpectingError('bob');
      await requestDocsExpectingError('bob');
      await requestDocsExpectingError('bob');

      const log = await getUserFailureLog('bob');
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
      await requestDocsExpectingError('bob');

      // Seed the log doc with 50 existing failures
      const logId = getFailureLogId('bob');
      const existentLog = await utils.logsDb.get(logId);
      existentLog.failures = Array.from({ length: 50 }, (_, i) => ({
        date: Date.now() - (50 - i) * 1000,
        status_code: 500,
        duration: 100,
        request_id: `seed-${i}`,
      }));
      existentLog.total_failures = 50;
      await utils.logsDb.put(existentLog);

      await requestDocsExpectingError('bob');

      const log = await getUserFailureLog('bob');
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
          _id: `replication-fail-${period}-bob`,
          user: 'bob',
          date: moment(period, 'YYYY-MM').valueOf(),
          total_failures: 0,
          failures: [],
        });
      }

      await requestDocsExpectingError('bob');

      // New log for the current reporting period
      const currentPeriod = moment().format('YYYY-MM');
      const currentResponse = await getFailureLogs({ user: 'bob', reportingPeriod: currentPeriod });
      expect(currentResponse.data).to.have.lengthOf(1);
      expect(currentResponse.data[0]._id).to.equal(`replication-fail-${currentPeriod}-bob`);
      expect(currentResponse.data[0].failures).to.have.lengthOf(1);
      expect(currentResponse.data[0].total_failures).to.equal(1);

      // Previous periods' logs are untouched
      for (const period of previousPeriods) {
        const oldResponse = await getFailureLogs({ user: 'bob', reportingPeriod: period });
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
          _id: `replication-fail-${period}-bob`,
          user: 'bob',
          date: moment(period, 'YYYY-MM').valueOf(),
          total_failures: 3,
          failures: [
            { date: 1, status_code: 500, duration: 10, request_id: `${period}-a` },
          ],
        });
      }

      await requestDocsExpectingError('bob');

      const { data } = await getFailureLogs({ user: 'bob' });
      const ids = data.map(log => log._id).sort();
      expect(ids).to.include(`replication-fail-${moment().format('YYYY-MM')}-bob`);
      for (const period of previousPeriods) {
        expect(ids).to.include(`replication-fail-${period}-bob`);
      }
      data.forEach(log => {
        expect(log).to.not.have.property('type');
        expect(log.user).to.equal('bob');
        expect(log.failures).to.be.an('array');
      });
    });

    it('should return full bodies for all users when no filters are provided', async () => {
      await requestDocsExpectingError('bob');
      await requestDocsExpectingError('clare');

      const response = await getFailureLogs();
      expect(response.data.length).to.be.at.least(2);

      const bobLog = response.data.find(log => log.user === 'bob');
      expect(bobLog.failures).to.have.lengthOf(1);
      expect(bobLog.total_failures).to.equal(1);

      const clareLog = response.data.find(log => log.user === 'clare');
      expect(clareLog.failures).to.have.lengthOf(1);
      expect(clareLog.total_failures).to.equal(1);

      expect(bobLog._id).to.not.equal(clareLog._id);
    });

    it('should respect the limit parameter and return a next-page cursor', async () => {
      await requestDocsExpectingError('bob');
      await requestDocsExpectingError('clare');

      const response = await getFailureLogs({ limit: 1 });
      expect(response.data).to.have.lengthOf(1);
      expect(response.cursor).to.not.be.null;
    });

    it('should walk pages via the returned cursor', async () => {
      await requestDocsExpectingError('bob');
      await requestDocsExpectingError('clare');

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
