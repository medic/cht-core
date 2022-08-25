const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const querystring = require('querystring');
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

const requestChanges = (username, params = {}) => {
  const queryParams = querystring.stringify(params);
  const options = {
    path: `/_changes${queryParams ? `?${queryParams}`: ''}`,
    auth: { username, password },
  };
  return utils.requestOnTestDb(options);
};

const getPurgeInfo = username => {
  const options = {
    path: `/purging`,
    auth: { username, password },
    headers: { 'medic-replication-id': username }
  };
  return utils.request(options);
};

const writePurgeCheckpoint = (username, seq) => {
  const options = {
    path: `/purging/checkpoint?seq=${seq || 'now'}`,
    auth: { username, password },
    headers: { 'medic-replication-id': username }
  };
  return utils.request(options);
};

const requestPurges = username => {
  const options = {
    path: '/purging/changes',
    auth: { username, password },
    headers: { 'medic-replication-id': username }
  };
  return utils.request(options);
};

const requestPurgeInfo = username => {
  const options = {
    path: '/purging',
    auth: { username, password },
  };
  return utils.request(options);
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

const getChangeIds = changes => changes.map(change => change.id);
const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

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

    let responseChangesUser1 = await requestChanges('user1');
    let responseChangesUser2 = await requestChanges('user2');

    let user1ChangeIds = getChangeIds(responseChangesUser1.results);
    let user2ChangeIds = getChangeIds(responseChangesUser2.results);

    chai.expect(user1ChangeIds)
      .to.include.members([
        'clinic1', 'contact1',
        'report2', 'report5', 'report6', 'report11',
        'message2', 'message4',
        'task1~user1', 'task2~user1', 'task3~user1',
      ]);
    chai.expect(user1ChangeIds)
      .to.not.include('report1')
      .and.not.include('report3')
      .and.not.include('report4')
      .and.not.include('report9')
      .and.not.include('report10')
      .and.not.include('message1')
      .and.not.include('message3')
      .and.not.include('task4~user1');

    chai.expect(user2ChangeIds)
      .to.include.members([
        'clinic1', 'contact1',
        'report1', 'report3', 'report4', 'report11', 'report9', 'report10',
        'message1', 'message3',
        'task1~user2', 'task2~user2', 'task3~user2',
        ...targetIdsToKeep
      ]);
    chai.expect(user2ChangeIds)
      .to.not.include('report2')
      .and.not.include('report5')
      .and.not.include('report6')
      .and.not.include('message2')
      .and.not.include('message4')
      .and.not.include('task4~user2');

    targetIdsToPurge.map(targetID => chai.expect(user2ChangeIds).not.to.include(targetID));

    const purgedIdsUser1 = await requestPurges('user1');
    const purgedIdsUser2 = await requestPurges('user2');

    chai.expect(purgedIdsUser1.purged_ids).to.have.members([
      'report1',
      'report3',
      'report4',
      'message1',
      'message3',
      'report9',
      'report10',
      'task4~user1',
      ...targetIdsToPurge,
    ]);
    chai.expect(purgedIdsUser2.purged_ids).to.have.members([
      'report2', 'report5', 'report6', 'message2', 'message4', 'task4~user2', ...targetIdsToPurge
    ]);

    await utils.revertSettings(true);
    await utils.updateSettings({ district_admins_access_unallocated_messages: true }, true);

    responseChangesUser1 = await requestChanges('user1');
    responseChangesUser2 = await requestChanges('user2');

    user1ChangeIds = getChangeIds(responseChangesUser1.results);
    user2ChangeIds = getChangeIds(responseChangesUser2.results);

    chai.expect(user1ChangeIds).to.include.members(['report8']);
    chai.expect(user1ChangeIds).to.not.include('report7');
    chai.expect(user2ChangeIds).to.include.members(['report7']);
    chai.expect(user2ChangeIds).to.not.include('report8');
  });

  it('should not re-purge docs', () => {
    let seq;
    return Promise
      .all([
        writePurgeCheckpoint('user1'),
        writePurgeCheckpoint('user2'),
      ])
      .then(() => sentinelUtils.getCurrentSeq())
      .then(result => {
        seq = result;
        return utils.updateSettings({ purge: purgeSettings }, true);
      })
      .then(() => restartSentinel())
      .then(() => sentinelUtils.waitForPurgeCompletion(seq))
      .then(() => Promise.all([
        requestChanges('user1', { initial_replication: true }),
        requestChanges('user2', { initial_replication: true }),
      ]))
      .then(([user1Changes, user2Changes]) => {
        const user1ChangeIds = getChangeIds(user1Changes.results);
        const user2ChangeIds = getChangeIds(user2Changes.results);

        chai.expect(user1ChangeIds)
          .to.include.members([
            'clinic1', 'contact1',
            'report2', 'report5', 'report6',
            'message2', 'message4',
            'task1~user1', 'task2~user1', 'task3~user1',
          ]);
        chai.expect(user1ChangeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3')
          .and.not.include('task4~user1');

        chai.expect(user2ChangeIds)
          .to.include.members([
            'clinic1', 'contact1',
            'report1', 'report3', 'report4',
            'message1', 'message3',
            'task1~user2', 'task2~user2', 'task3~user2',
          ]);
        chai.expect(user2ChangeIds)
          .to.not.include('report2')
          .and.not.include('report5')
          .and.not.include('report6')
          .and.not.include('message2')
          .and.not.include('message4')
          .and.not.include('task4~user2');
      })
      .then(() => Promise.all([requestPurges('user1'), requestPurges('user2')]))
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        // no new purges
        chai.expect(purgedDocsUser1.purged_ids).to.deep.equal([]);
        chai.expect(purgedDocsUser2.purged_ids).to.deep.equal([]);
      });
  });

  it('should clear purged cache', () => {
    let seq;
    return sentinelUtils.getCurrentSeq()
      .then(result => {
        seq = result;
        purgeSettings.fn = reversePurgeFn.toString();
        return utils.updateSettings({ purge: purgeSettings }, true);
      })
      .then(() => restartSentinel())
      .then(() => sentinelUtils.waitForPurgeCompletion(seq))
      .then(() => Promise.all([requestPurges('user1'), requestPurges('user2')]))
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        // reverse purges
        chai.expect(purgedDocsUser1.purged_ids)
          .to.have.members(['report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(purgedDocsUser2.purged_ids).to.have.members([
          'report1',
          'report3',
          'report4',
          'report9',
          'report10',
          'message1',
          'message3',
        ]);
      })
      .then(() => Promise.all([
        requestChanges('user1', { initial_replication: true }),
        requestChanges('user2', { initial_replication: true }),
      ]))
      .then(([user1Changes, user2Changes]) => {
        const user1ChangeIds = getChangeIds(user1Changes.results);
        const user2ChangeIds = getChangeIds(user2Changes.results);

        chai.expect(user1ChangeIds)
          .to.include.members([
            'clinic1', 'contact1',
            'report1', 'report3', 'report4',
            'message1', 'message3',
            'task1~user1', 'task2~user1', 'task3~user1',
          ]);
        chai.expect(user1ChangeIds)
          .to.not.include('report2')
          .and.not.include('report5')
          .and.not.include('report6')
          .and.not.include('message2')
          .and.not.include('message4')
          .and.not.include('task4~user1');

        chai.expect(user2ChangeIds)
          .to.include.members([
            'clinic1', 'contact1',
            'report2', 'report5', 'report6',
            'message2', 'message4',
            'task1~user2', 'task2~user2', 'task3~user2',
          ]);
        chai.expect(user2ChangeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3')
          .and.not.include('task4~user2');
      });
  });

  it('should get changes from checkpointer', () => {
    let seqUser1;
    let seqUser2;

    return Promise
      .all([
        requestPurges('user1'),
        requestPurges('user2'),
        getPurgeInfo('user1'),
        getPurgeInfo('user2')
      ])
      .then(([purgedDocsUser1, purgedDocsUser2, infoUser1, infoUser2]) => {
        // reverse purges
        chai.expect(purgedDocsUser1.purged_ids)
          .to.have.members(['report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(purgedDocsUser2.purged_ids).to.have.members([
          'report1',
          'report3',
          'report4',
          'report9',
          'report10',
          'message1',
          'message3',
        ]);
        chai.assert(infoUser1.update_seq);
        chai.assert(infoUser2.update_seq);

        chai.expect(parseInt(infoUser1.update_seq)).to.equal(parseInt(purgedDocsUser1.last_seq));
        chai.expect(parseInt(infoUser2.update_seq)).to.equal(parseInt(purgedDocsUser2.last_seq));

        seqUser1 = infoUser1.update_seq;
        seqUser2 = infoUser2.update_seq;
      })
      .then(() => Promise.all([
        writePurgeCheckpoint('user1', seqUser1),
        writePurgeCheckpoint('user2', seqUser2),
      ]))
      .then(() => Promise.all([requestPurges('user1'), requestPurges('user2')]))
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        chai.expect(purgedDocsUser1.purged_ids).to.deep.equal([]);
        chai.expect(purgedDocsUser2.purged_ids).to.deep.equal([]);
        chai.expect(parseInt(purgedDocsUser1.last_seq)).to.equal(parseInt(seqUser1));
        chai.expect(parseInt(purgedDocsUser2.last_seq)).to.equal(parseInt(seqUser2));
      });
  });

  it('should reset checkpointer when user roles change', () => {
    const opts = {
      path: '/api/v1/users/user1',
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: {
        roles: ['district_admin', 'purge_reverse']
      }
    };
    return utils
      .request(opts)
      .then(() => requestChanges('user1'))
      .then(result => {
        const changeIds = getChangeIds(result.results);
        chai.expect(changeIds)
          .to.include.members([
            'clinic1', 'contact1',
            'report2', 'report5', 'report6',
            'message2', 'message4',
            'task1~user1', 'task2~user1', 'task3~user1',
          ]);
        chai.expect(changeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3')
          .and.not.include('task4~user1');
      })
      .then(() => requestPurges('user1'))
      .then(purgedDocs => {
        chai.expect(purgedDocs.purged_ids).to.have.members([
          'report1',
          'report3',
          'report4',
          'report9',
          'report10',
          'message1',
          'message3',
          'task4~user1',
          ...targetIdsToPurge,
        ]);
      })
      .then(() => writePurgeCheckpoint('user1'))
      .then(() => requestPurges('user1'))
      .then(purgedDocs => {
        chai.expect(purgedDocs.purged_ids).to.be.empty;
      });
  });

  it('should not auto create purge dbs when user roles change', () => {
    const opts = {
      path: '/api/v1/users/user1',
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: {
        roles: ['district_admin', 'random']
      }
    };

    let purgeDbs;
    return sentinelUtils
      .getPurgeDbs()
      .then(dbs => purgeDbs = dbs)
      .then(() => utils.request(opts))
      .then(() => Promise.all([ requestPurgeInfo('user1'),  requestPurges('user1')]))
      .then(([ info, purgedDocs ]) => {
        chai.expect(info).to.be.false;
        chai.expect(purgedDocs).to.deep.equal({});
      })
      .then(() => sentinelUtils.getPurgeDbs())
      .then(dbs => {
        chai.expect(dbs).to.deep.equal(purgeDbs);
      });
  });
});
