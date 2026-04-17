const utils = require('@utils');
const moment = require('moment');
const { CONTACT_TYPES } = require('@medic/constants');
const constants = require('@constants');

const password = 'passwordSUP3RS3CR37!';

const requestDocs = (username) => {
  const options = {
    path: '/api/v1/replication/get-ids',
    auth: { username, password }
  };
  return utils.request(options);
};

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const users = [
  {
    username: 'bob',
    password: password,
    place: {
      _id: 'fixture:bobville',
      type: CONTACT_TYPES.HEALTH_CENTER,
      name: 'Bobville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:bobville',
    },
    contact: {
      _id: 'fixture:user:bob',
      name: 'Bob',
      patient_id: 'shortcode:user:bob',
    },
    roles: ['district_admin']
  },
  {
    username: 'clare',
    password: password,
    place: {
      _id: 'fixture:clareville',
      type: CONTACT_TYPES.HEALTH_CENTER,
      name: 'Clareville',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:clareville',
    },
    contact: {
      _id: 'fixture:user:clare',
      name: 'Clare',
      patient_id: 'shortcode:clare',
    },
    roles: ['district_admin']
  },
];

// This test depends on stopping Nouveau service in order to fail the replication requests, so we capture how the user
// subject count is stored. In k3d, Nouveau doesn't have its own deployment, it's paired with CouchDb to insure that
// shared storage is always on the same pod.
describe('replication failure logging @docker', () => {
  const getFailureLogId = (username) => `replication-fail-${moment().format('YYYY-MM')}-${username}`;

  const getFailureLogs = (month) => {
    const options = { path: '/api/v1/replication-failure-logs' };
    if (month) {
      options.path += `?month=${month}`;
    }
    return utils.request(options);
  };

  const getFailureLog = async (username, month) => {
    const params = new URLSearchParams({ user: username });
    if (month) {
      params.set('month', month);
    }
    const response = await utils.request({
      path: `/api/v1/replication-failure-logs?${params.toString()}`,
    });
    if (month) {
      return response.log;
    }
    // No month: server returns all logs for this user across months. Prefer the current month,
    // falling back to the first log (tests without seeded months only ever hit the current one).
    const currentMonthId = getFailureLogId(username);
    return response.logs.find(log => log._id === currentMonthId) || response.logs[0] || null;
  };

  const getAllLogsForUser = async (username) => {
    const response = await utils.request({
      path: `/api/v1/replication-failure-logs?user=${username}`,
    });
    return response.logs;
  };

  const clearLogs = async () => {
    const result = await utils.logsDb.allDocs({
      include_docs: true,
      startkey: 'replication-fail-',
      endkey: 'replication-fail\uffff'
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
    await expect(requestDocs(username)).to.be.rejectedWith();
    await utils.delayPromise(100); // wait for doc to be written
  };

  before(async () => {
    await utils.saveDoc(parentPlace);
    await utils.createUsers(users, true);
    await utils.stopService('nouveau');
  });

  after(async () => {
    await utils.startService('nouveau');
    await utils.revertDb([], true);
    await utils.deleteUsers(users, true);
    await utils.deletePurgeDbs();
  });

  afterEach(async () => {
    await clearLogs();
  });

  it('should not create a failure log on a successful requests', async () => {
    const response = await getFailureLogs();
    const bobSummary = response.logs.find(log => log.user === 'bob');
    expect(bobSummary).to.be.undefined;

    const bobLog = await getFailureLog('bob');
    expect(bobLog).to.be.null;
  });

  it('should create a failure log when the request fails', async () => {
    await requestDocsExpectingError('bob');

    const log = await getFailureLog('bob');
    expect(log.type).to.equal('replication-fail');
    expect(log.user).to.equal('bob');
    expect(log.failures.length).to.eq(1);
    expect(log.failures[0]).to.have.keys(
      'timestamp', 'status_code', 'duration', 'request_id', 'roles', 'subjects_count'
    );
    expect(log.failures[0].status_code).to.be.at.least(400);
    expect(log.failures[0].roles).to.be.an('array').that.is.not.empty;
    expect(log.failures[0].subjects_count).to.equal(6);
    expect(log.total_failures).to.equal(1);
  });

  it('should accumulate failures in the same log document', async () => {
    await requestDocsExpectingError('bob');
    await requestDocsExpectingError('bob');
    await requestDocsExpectingError('bob');

    const log = await getFailureLog('bob');
    expect(log.failures).to.be.an('array').that.has.lengthOf(3);
    expect(log.total_failures).to.equal(3);
    log.failures.forEach(failure => {
      expect(failure).to.have.keys(
        'timestamp', 'status_code', 'duration', 'request_id', 'roles', 'subjects_count'
      );
      expect(failure.subjects_count).to.equal(6);
    });
  });

  it('should cap stored failures at 50 and track total count', async () => {
    // Create an initial failure to get a real log doc
    await requestDocsExpectingError('bob');

    // Seed the log doc with 50 existing failures
    const logId = getFailureLogId('bob');
    const existentLog = await utils.logsDb.get(logId);
    existentLog.failures = Array.from({ length: 50 }, (_, i) => ({
      timestamp: Date.now() - (50 - i) * 1000,
      status_code: 500,
      duration: 100,
      request_id: `seed-${i}`,
    }));
    existentLog.total_failures = 50;
    await utils.logsDb.put(existentLog);

    await requestDocsExpectingError('bob');

    const log = await getFailureLog('bob');
    expect(log.failures).to.have.lengthOf(50);
    expect(log.total_failures).to.equal(51);
    expect(log.failures[0].request_id).to.equal('seed-1');
    expect(log.failures[49].request_id).to.not.match(/^seed-/);
  });

  it('should create a new log for the current month even when previous months exist', async () => {
    const previousMonths = [
      moment().subtract(1, 'months').format('YYYY-MM'),
      moment().subtract(2, 'months').format('YYYY-MM'),
      moment().subtract(3, 'months').format('YYYY-MM'),
    ];

    // Seed logs for previous months
    for (const month of previousMonths) {
      await utils.logsDb.put({
        _id: `replication-fail-${month}-bob`,
        type: 'replication-fail',
        user: 'bob',
        timestamp: moment(month, 'YYYY-MM').valueOf(),
        total_failures: 0,
        failures: [],
      });
    }

    await requestDocsExpectingError('bob');

    // New log is created for the current month
    const currentMonth = moment().format('YYYY-MM');
    const currentLog = await getFailureLog('bob', currentMonth);
    expect(currentLog).to.not.be.null;
    expect(currentLog._id).to.equal(`replication-fail-${currentMonth}-bob`);
    expect(currentLog.failures).to.have.lengthOf(1);
    expect(currentLog.total_failures).to.equal(1);

    // Previous months' logs are untouched
    for (const month of previousMonths) {
      const oldLog = await getFailureLog('bob', month);
      expect(oldLog).to.not.be.null;
      expect(oldLog.failures).to.have.lengthOf(0);
      expect(oldLog.total_failures).to.equal(0);
    }
  });

  it('should return all monthly logs for a user when month is not provided', async () => {
    const previousMonths = [
      moment().subtract(1, 'months').format('YYYY-MM'),
      moment().subtract(2, 'months').format('YYYY-MM'),
    ];

    // Seed logs for previous months
    for (const month of previousMonths) {
      await utils.logsDb.put({
        _id: `replication-fail-${month}-bob`,
        type: 'replication-fail',
        user: 'bob',
        timestamp: moment(month, 'YYYY-MM').valueOf(),
        total_failures: 3,
        failures: [
          { timestamp: 1, status_code: 500, duration: 10, request_id: `${month}-a` },
        ],
      });
    }

    await requestDocsExpectingError('bob');

    const logs = await getAllLogsForUser('bob');
    const months = logs.map(log => log._id).sort();
    expect(months).to.include(`replication-fail-${moment().format('YYYY-MM')}-bob`);
    for (const month of previousMonths) {
      expect(months).to.include(`replication-fail-${month}-bob`);
    }
    // Every returned log should have full details
    logs.forEach(log => {
      expect(log.type).to.equal('replication-fail');
      expect(log.user).to.equal('bob');
      expect(log.failures).to.be.an('array');
    });
  });

  it('should create separate failure logs for different users', async () => {
    await requestDocsExpectingError('bob');
    await requestDocsExpectingError('clare');

    const response = await getFailureLogs();
    expect(response.logs.length).to.be.at.least(2);

    const bobSummary = response.logs.find(log => log.user === 'bob');
    expect(bobSummary.user).to.equal('bob');
    expect(bobSummary.total_failures).to.equal(1);
    expect(bobSummary.failures).to.be.undefined;

    const clareSummary = response.logs.find(log => log.user === 'clare');
    expect(clareSummary.user).to.equal('clare');
    expect(clareSummary.total_failures).to.equal(1);
    expect(clareSummary.failures).to.be.undefined;

    expect(bobSummary._id).to.not.equal(clareSummary._id);

    // Full details still available via the per-user endpoint
    const bobLog = await getFailureLog('bob');
    expect(bobLog.failures).to.have.lengthOf(1);
    const clareLog = await getFailureLog('clare');
    expect(clareLog.failures).to.have.lengthOf(1);
  });
});
