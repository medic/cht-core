const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const chai = require('chai');
const moment = require('moment');

const password = 'SuperS3creT';
const docs = [
  {
    _id: 'clinic1',
    type: 'clinic',
    name: 'Clinic 1',
    parent: {},
    reported_date: 100,
  },
  {
    _id: 'contact1',
    type: 'person',
    patient_id: 'patient1',
    parent: { _id: 'clinic1' },
    reported_date: 100,
  },
  {
    _id: 'report1',
    type: 'data_record',
    form: 'yes',
    fields: {
      place_id: 'clinic1'
    },
    to_be_purged: true,
  },
  {
    _id: 'report2',
    type: 'data_record',
    form: 'yes',
    fields: {
      place_id: 'clinic1'
    },
    to_be_purged: false,
  },
  {
    _id: 'report3',
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: 'patient1'
    },
    to_be_purged: true,
  },
  {
    _id: 'report4',
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: '',
      patient_uuid: 'contact1'
    },
    to_be_purged: true,
  },
  {
    _id: 'report5',
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: 'patient1'
    },
    to_be_purged: false,
  },
  {
    _id: 'report6',
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: '',
      patient_uuid: 'contact1'
    },
    to_be_purged: false,
  },
  {
    _id: 'report7', // unassigned
    type: 'data_record',
    form: 'yes',
    fields: {},
    to_be_purged: true,
  },
  {
    _id: 'report8', // unassigned
    type: 'data_record',
    form: 'yes',
    fields: {},
    to_be_purged: false,
  },
  {
    _id: 'report9',
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: 'patient1',
      needs_signoff: true,
    },
    contact: { _id: 'fixture:user:user1', parent: { _id: 'clinic1' } },
    to_be_purged: true,
  },
  {
    _id: 'report10',
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: 'patient1',
      needs_signoff: true,
    },
    errors: [{ code: 'registration_not_found' }],
    contact: { _id: 'fixture:user:user1', parent: { _id: 'clinic1' } },
    to_be_purged: true,
  },
  {
    _id: 'report11', // orphaned needs signoff
    type: 'data_record',
    form: 'yes',
    fields: {
      patient_id: 'orphaned',
      needs_signoff: true,
    },
    contact: { _id: 'fixture:user:user1', parent: { _id: 'clinic1' } },
    to_be_purged: true,
  },
  {
    _id: 'message1',
    type: 'data_record',
    sms_message: true,
    contact: { _id: 'clinic1' },
    to_be_purged: true,
  },
  {
    _id: 'message2',
    type: 'data_record',
    sms_message: true,
    contact: { _id: 'clinic1' },
    to_be_purged: false,
  },
  {
    _id: 'message3',
    type: 'data_record',
    kujua_message: true,
    tasks: [{ messages: [{ contact: { _id: 'contact1' } }] }],
    to_be_purged: true,
  },
  {
    _id: 'message4',
    type: 'data_record',
    kujua_message: true,
    tasks: [{ messages: [{ contact: { _id: 'contact1' } }] }],
    to_be_purged: false,
  },
];

const daysAgo = days => moment().subtract(days, 'days').format('Y-MM-DD');

const tasks = [
  {
    _id: 'task1~user1',
    type: 'task',
    user: 'org.couchdb.user:user1',
    owner: 'contact1',
    state: 'Draft',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(30),
    }
  },
  {
    _id: 'task2~user1',
    type: 'task',
    user: 'org.couchdb.user:user1',
    owner: 'contact1',
    state: 'Draft',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(98),
    }
  },
  {
    _id: 'task3~user1',
    type: 'task',
    user: 'org.couchdb.user:user1',
    owner: 'contact1',
    state: 'Completed',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(50),
    }
  },
  {
    _id: 'task4~user1',
    type: 'task',
    user: 'org.couchdb.user:user1',
    owner: 'contact1',
    state: 'Completed',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(100),
    }
  },
  {
    _id: 'task1~user2',
    type: 'task',
    user: 'org.couchdb.user:user2',
    owner: 'contact1',
    state: 'Ready',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(10),
    }
  },
  {
    _id: 'task2~user2',
    type: 'task',
    user: 'org.couchdb.user:user2',
    owner: 'contact1',
    state: 'Ready',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(150),
    }
  },
  {
    _id: 'task3~user2',
    type: 'task',
    user: 'org.couchdb.user:user2',
    owner: 'contact1',
    state: 'Failed',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(58),
    }
  },
  {
    _id: 'task4~user2',
    type: 'task',
    user: 'org.couchdb.user:user2',
    owner: 'contact1',
    state: 'Failed',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(62),
    }
  },
];

const latestTargetInterval = moment().subtract(7, 'months').format('YYYY-MM');
const targets = [
  {
    _id: `target~${moment().subtract(9, 'months').format('YYYY-MM')}~org.couchdb.user:user2`,
    type: 'target',
    user: 'org.couchdb.user:user2',
    owner: 'fixture:user:user2',
    reporting_period: moment().subtract(9, 'months').format('YYYY-MM'),
    targets: [],
  },
  {
    _id: `target~${moment().subtract(6, 'months').format('YYYY-MM')}~org.couchdb.user:user2`,
    type: 'target',
    user: 'org.couchdb.user:user2',
    owner: 'fixture:user:user2',
    reporting_period: moment().subtract(6, 'months').format('YYYY-MM'),
    targets: [],
  },
  {
    _id: `target~${moment().subtract(7, 'months').subtract(2, 'days').format('YYYY-MM')}~org.couchdb.user:user2`,
    type: 'target',
    user: 'org.couchdb.user:user2',
    owner: 'fixture:user:user2',
    reporting_period: moment().subtract(7, 'months').subtract(2, 'days').format('YYYY-MM'),
    targets: [],
  },
  {
    _id: `target~${moment().subtract(3, 'months').format('YYYY-MM')}~org.couchdb.user:user2`,
    type: 'target',
    user: 'org.couchdb.user:user2',
    owner: 'fixture:user:user2',
    reporting_period: moment().subtract(3, 'months').format('YYYY-MM'),
    targets: [],
  },
];

const targetIdsToPurge = [];
const targetIdsToKeep = [];
targets.forEach(target => {
  if (target.reporting_period > latestTargetInterval) {
    targetIdsToKeep.push(target._id);
  } else {
    targetIdsToPurge.push(target._id);
  }
});
const users = [
  {
    username: 'user1',
    password: password,
    place: 'clinic1',
    contact: {
      _id: 'fixture:user:user1',
      name: 'OfflineUser'
    },
    roles: ['district_admin', 'purge_regular']
  },
  {
    username: 'user2',
    password: password,
    place: 'clinic1',
    contact: {
      _id: 'fixture:user:user2',
      name: 'OfflineUser'
    },
    roles: ['district_admin', 'purge_reverse']
  },
];

const purgeFn = function(userCtx, contact, reports, messages) {
  const ids = [];

  if (userCtx.roles.includes('purge_reverse')) {
    ids.push(...reports.filter(r => !r.to_be_purged).map(r => r._id));
    ids.push(...messages.filter(r => !r.to_be_purged).map(r => r._id));
  } else {
    ids.push(...reports.filter(r => r.to_be_purged).map(r => r._id));
    ids.push(...messages.filter(r => r.to_be_purged).map(r => r._id));
  }

  return ids;
};

const reversePurgeFn = function(userCtx, contact, reports, messages) {
  const ids = [];

  if (userCtx.roles.includes('purge_regular')) {
    ids.push(...reports.filter(r => !r.to_be_purged).map(r => r._id));
    ids.push(...messages.filter(r => !r.to_be_purged).map(r => r._id));
  } else {
    ids.push(...reports.filter(r => r.to_be_purged).map(r => r._id));
    ids.push(...messages.filter(r => r.to_be_purged).map(r => r._id));
  }

  return ids;
};

const purgeSettings = {
  fn: purgeFn.toString(),
  text_expression: 'every 1 seconds'
};

const requestDocs = async (username) => {
  const options = {
    path: `/api/v1/replication/get-ids`,
    auth: { username, password },
  };
  const result = await utils.request(options);
  return result.doc_ids_revs;
};

const requestDeletes = async (username, ids) => {
  const options = {
    path: `/api/v1/replication/get-deletes`,
    method: 'POST',
    body: { doc_ids: ids },
    auth: { username, password },
  };
  const result = await utils.request(options);
  return result.doc_ids;
};

const getPurgeLog = () => {
  return sentinelUtils
    .requestOnSentinelTestDb({
      path: '/_all_docs',
      qs: {
        startkey: JSON.stringify('purgelog\ufff0'),
        limit: 1,
        include_docs: true,
        descending: true,
      }
    })
    .then(result => result.rows[0].doc);
};

const getDocIds = docs => docs.map(doc => doc.id);
const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

const updateUser = async user => {
  const opts = {
    path: `/api/v1/users/${user.username}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: user,
  };
  await utils.request(opts);
};

describe('Server side purge', () => {
  before(async () => {
    await utils.revertDb([], true);
    const existingUsers = await utils.getCreatedUsers();
    await utils.deleteUsers(existingUsers);
    await utils.saveDocs([...docs, ...tasks, ...targets]);
    await utils.createUsers(users);
  });

  after(async () => {
    await utils.revertDb([], true);
    await sentinelUtils.deletePurgeDbs();
    await utils.deleteUsers(users);
  });

  afterEach(() => utils.revertSettings(true));

  it('should purge correct docs', async () => {
    const seq = await sentinelUtils.getCurrentSeq();
    await utils.updateSettings({ purge: purgeSettings }, true);
    await restartSentinel();
    await sentinelUtils.waitForPurgeCompletion(seq);

    const purgeLog = await getPurgeLog();

    chai.expect(Object.values(purgeLog.roles)).to.deep.equal([
      users[0].roles,
      users[1].roles,
    ]);
    chai.expect(purgeLog.skipped_contacts).to.deep.equal([]);
    chai.expect(purgeLog.error).to.equal(undefined);
    chai.expect(purgeLog.duration).to.be.a('number');

    const responseDocsUser1 = await requestDocs('user1');
    const responseDocsUser2 = await requestDocs('user2');

    const user1Docs = getDocIds(responseDocsUser1);
    const user2Docs = getDocIds(responseDocsUser2);

    chai.expect(user1Docs).to.include.members([
      'clinic1', 'contact1',
      'report2', 'report5', 'report6', 'report11',
      'message2', 'message4',
      'task1~user1', 'task2~user1', 'task3~user1',
    ]);
    const purgedDocsUser1 = [
      'report1', 'report3', 'report4', 'report9', 'report10', 'message1', 'message3', 'task4~user1', ...targetIdsToPurge
    ];
    purgedDocsUser1.forEach(id => chai.expect(user1Docs).to.not.include(id));

    chai.expect(user2Docs).to.include.members([
      'clinic1', 'contact1',
      'report1', 'report3', 'report4', 'report11', 'report9', 'report10',
      'message1', 'message3',
      'task1~user2', 'task2~user2', 'task3~user2',
      ...targetIdsToKeep
    ]);
    const purgedDocsUser2 = [
      'report2', 'report5', 'report6', 'message2', 'message4', 'task4~user2', ...targetIdsToPurge
    ];
    purgedDocsUser2.forEach(id => chai.expect(user2Docs).to.not.include(id));

    const purgedIdsUser1 = await requestDeletes('user1', purgedDocsUser1);
    const purgedIdsUser2 = await requestDeletes('user2', purgedDocsUser2);

    chai.expect(purgedIdsUser1).to.have.members(purgedDocsUser1);
    chai.expect(purgedIdsUser2).to.have.members(purgedDocsUser2);
  });

  it('should clear purged cache when settings are updated', async () => {
    await utils.updateSettings({ district_admins_access_unallocated_messages: true }, true);

    const responseDocsUser1 = await requestDocs('user1');
    const responseDocsUser2 = await requestDocs('user2');

    const user1Docs = getDocIds(responseDocsUser1);
    const user2Docs = getDocIds(responseDocsUser2);

    chai.expect(user1Docs).to.include.members(['report8']);
    chai.expect(user1Docs).to.not.include('report7');
    chai.expect(user2Docs).to.include.members(['report7']);
    chai.expect(user2Docs).to.not.include('report8');
  });

  it('should clear purged cache when purging runs again', () => {
    const purgedIdsUser1 = ['report2', 'report5', 'report6', 'message2', 'message4'];
    const purgedIdsUser2 = [
      'report1',
      'report3',
      'report4',
      'report9',
      'report10',
      'message1',
      'message3',
    ];
    let seq;
    return sentinelUtils.getCurrentSeq()
      .then(result => {
        seq = result;
        purgeSettings.fn = reversePurgeFn.toString();
        return utils.updateSettings({ purge: purgeSettings }, true);
      })
      .then(() => restartSentinel())
      .then(() => sentinelUtils.waitForPurgeCompletion(seq))
      .then(() => Promise.all([requestDeletes('user1', purgedIdsUser1), requestDeletes('user2', purgedIdsUser2)]))
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        // reverse purges
        chai.expect(purgedDocsUser1).to.have.members(purgedIdsUser1);
        chai.expect(purgedDocsUser2).to.have.members(purgedIdsUser2);
      })
      .then(() => Promise.all([
        requestDocs('user1'),
        requestDocs('user2'),
      ]))
      .then(([user1Docs, user2Docs]) => {
        const user1DocIds = getDocIds(user1Docs);
        const user2ChangeIds = getDocIds(user2Docs);

        chai.expect(user1DocIds).to.include.members([
          'clinic1', 'contact1',
          'report1', 'report3', 'report4',
          'message1', 'message3',
          'task1~user1', 'task2~user1', 'task3~user1',
        ]);
        user1DocIds.forEach(id => chai.expect(purgedIdsUser1).to.not.include(id));

        chai.expect(user2ChangeIds).to.include.members([
          'clinic1', 'contact1',
          'report2', 'report5', 'report6',
          'message2', 'message4',
          'task1~user2', 'task2~user2', 'task3~user2',
        ]);
        user2ChangeIds.forEach(id => chai.expect(purgedIdsUser2).to.not.include(id));
      });
  });

  it('should clear purged cache when users are updated', async () => {
    const seq = await sentinelUtils.getCurrentSeq();
    purgeSettings.fn = purgeFn.toString();
    await utils.updateSettings({ purge: purgeSettings }, true);
    await restartSentinel();
    await sentinelUtils.waitForPurgeCompletion(seq);

    let responseDocsUser1 = await requestDocs('user1');
    let responseDocsUser2 = await requestDocs('user2');

    let user1Docs = getDocIds(responseDocsUser1);
    let user2Docs = getDocIds(responseDocsUser2);

    expect(user1Docs).to.include.members([
      'clinic1', 'contact1',
      'report2', 'report5', 'report6', 'report11',
      'message2', 'message4',
      'task1~user1', 'task2~user1', 'task3~user1',
    ]);
    const purgedDocsUser1 = [
      'report1', 'report3', 'report4', 'report9', 'report10', 'message1', 'message3', 'task4~user1', ...targetIdsToPurge
    ];
    purgedDocsUser1.forEach(id => chai.expect(user1Docs).to.not.include(id));

    expect(user2Docs).to.include.members([
      'clinic1', 'contact1',
      'report1', 'report3', 'report4', 'report11', 'report9', 'report10',
      'message1', 'message3',
      'task1~user2', 'task2~user2', 'task3~user2',
      ...targetIdsToKeep
    ]);
    const purgedDocsUser2 = [
      'report2', 'report5', 'report6', 'message2', 'message4', 'task4~user2', ...targetIdsToPurge
    ];
    purgedDocsUser2.forEach(id => chai.expect(user2Docs).to.not.include(id));

    const purgedIdsUser1 = await requestDeletes('user1', purgedDocsUser1);
    const purgedIdsUser2 = await requestDeletes('user2', purgedDocsUser2);

    expect(purgedIdsUser1).to.have.members(purgedDocsUser1);
    expect(purgedIdsUser2).to.have.members(purgedDocsUser2);

    const updatedUser2 = {
      ...users[1],
      roles: ['district_admin', 'purge_regular'],
    };
    await updateUser(updatedUser2);

    responseDocsUser1 = await requestDocs('user1');
    responseDocsUser2 = await requestDocs('user2');

    user1Docs = getDocIds(responseDocsUser1);
    user2Docs = getDocIds(responseDocsUser2);

    expect(user1Docs).to.include.members([
      'clinic1', 'contact1',
      'report2', 'report5', 'report6', 'report11',
      'message2', 'message4',
      'task1~user1', 'task2~user1', 'task3~user1',
    ]);
    purgedDocsUser1.forEach(id => chai.expect(user1Docs).to.not.include(id));

    expect(user2Docs).to.include.members([
      'clinic1', 'contact1',
      'report2', 'report5', 'report6', 'report11',
      'message2', 'message4',
      'task1~user2', 'task2~user2', 'task3~user2',
    ]);
    purgedDocsUser1.forEach(id => chai.expect(user2Docs).to.not.include(id));
  });
});
