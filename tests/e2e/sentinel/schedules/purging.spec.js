const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const querystring = require('querystring');
const chai = require('chai');

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
  text_expression: 'every 10 seconds'
};

const getCurrentSeq = () => sentinelUtils.requestOnSentinelTestDb('').then(data => data.update_seq);
const waitForPurgeCompletion = seq => {
  const params = {
    since: seq,
    feed: 'longpoll',
  };
  return sentinelUtils
    .requestOnSentinelTestDb('/_changes?' + querystring.stringify(params))
    .then(result => {
      if (result.results && result.results.find(change => change.id.startsWith('purgelog:'))) {
        return;
      }

      return waitForPurgeCompletion(result.last_seq);
    });
};

const requestChanges = (username, params = {}) => {
  const queryParams = querystring.stringify(params);
  const options = {
    path: `/_changes${queryParams ? `?${queryParams}`: ''}`,
    auth: `${username}:${password}`
  };
  return utils.requestOnTestDb(options);
};

const writePurgeCheckpoint = (username, seq) => {
  const options = {
    path: `/api/v1/purging/checkpoint?seq=${seq || 'now'}`,
    auth: `${username}:${password}`,
    headers: { 'medic-replication-id': username }
  };
  return utils.request(options);
};

const requestPurges = username => {
  const options = {
    path: '/api/v1/purging/changes',
    auth: `${username}:${password}`,
    headers: { 'medic-replication-id': username }
  };
  return utils.request(options);
};

const getChangeIds = changes => changes.map(change => change.id);

describe('server side purge', () => {
  beforeAll(done => {
    return utils
      .saveDocs(docs)
      .then(() => users.reduce((p, user) => {
        return p.then(() => utils.request({
          path: '/api/v1/users',
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: user
        }));
      }, Promise.resolve()))
      .then(() => done());
  });
  afterAll(done =>
    utils
      .revertDb()
      .then(() => sentinelUtils.deletePurgeDbs())
      .then(() => utils.deleteUsers(users.map(user => user.username)))
      .then(() => done()));

  afterEach(done => utils.revertSettings().then(done));

  it('should purge correct docs', () => {
    let seq;
    return getCurrentSeq()
      .then(result => {
        seq = result;
        return utils.updateSettings({ purge: purgeSettings, reschedule: true });
      })
      .then(() => waitForPurgeCompletion(seq))
      .then(() => utils.revertSettings()) // stop purging
      .then(() => Promise.all([
        requestChanges('user1', { initial_replication: true }),
        requestChanges('user2', { initial_replication: true }),
      ]))
      .then(([user1Changes, user2Changes]) => {
        const user1ChangeIds = getChangeIds(user1Changes.results);
        const user2ChangeIds = getChangeIds(user2Changes.results);

        chai.expect(user1ChangeIds)
          .to.include.members(['clinic1', 'contact1', 'report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(user1ChangeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3');

        chai.expect(user2ChangeIds)
          .to.include.members(['clinic1', 'contact1', 'report1', 'report3', 'report4', 'message1', 'message3']);
        chai.expect(user2ChangeIds)
          .to.not.include('report2')
          .and.not.include('report5')
          .and.not.include('report6')
          .and.not.include('message2')
          .and.not.include('message4');
      })
      .then(() => Promise.all([ requestPurges('user1'), requestPurges('user2') ]))
      .then(([ purgedIdsUser1, purgedIdsUser2 ]) => {
        chai.expect(purgedIdsUser1.purged_ids).to.have.members(['report1', 'report3', 'report4', 'message1', 'message3']);
        chai.expect(purgedIdsUser2.purged_ids).to.have.members(['report2', 'report5', 'report6', 'message2', 'message4']);
      })
      .then(() => utils.updateSettings({ district_admins_access_unallocated_messages: true }))
      .then(() => Promise.all([
        requestChanges('user1', { initial_replication: true }),
        requestChanges('user2', { initial_replication: true }),
      ]))
      .then(([user1Changes, user2Changes]) => {
        const user1ChangeIds = getChangeIds(user1Changes.results);
        const user2ChangeIds = getChangeIds(user2Changes.results);

        chai.expect(user1ChangeIds).to.include.members(['report8']);
        chai.expect(user1ChangeIds).to.not.include('report7');
        chai.expect(user2ChangeIds).to.include.members(['report7']);
        chai.expect(user2ChangeIds).to.not.include('report8');
      });
  });

  it('should not re-purge docs', () => {
    let seq;
    return Promise
      .all([
        writePurgeCheckpoint('user1'),
        writePurgeCheckpoint('user2'),
      ])
      .then(() => getCurrentSeq())
      .then(result => {
        seq = result;
        return utils.updateSettings({ purge: purgeSettings, reschedule: true });
      })
      .then(() => waitForPurgeCompletion(seq))
      .then(() => utils.revertSettings()) // stop purging
      .then(() => Promise.all([
        requestChanges('user1', { initial_replication: true }),
        requestChanges('user2', { initial_replication: true }),
      ]))
      .then(([user1Changes, user2Changes]) => {
        const user1ChangeIds = getChangeIds(user1Changes.results);
        const user2ChangeIds = getChangeIds(user2Changes.results);

        chai.expect(user1ChangeIds)
          .to.include.members(['clinic1', 'contact1', 'report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(user1ChangeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3');

        chai.expect(user2ChangeIds)
          .to.include.members(['clinic1', 'contact1', 'report1', 'report3', 'report4', 'message1', 'message3']);
        chai.expect(user2ChangeIds)
          .to.not.include('report2')
          .and.not.include('report5')
          .and.not.include('report6')
          .and.not.include('message2')
          .and.not.include('message4');
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
    return getCurrentSeq()
      .then(result => {
        seq = result;
        purgeSettings.fn = reversePurgeFn.toString();
        return utils.updateSettings({ purge: purgeSettings, reschedule: true });
      })
      .then(() => waitForPurgeCompletion(seq))
      .then(() => utils.revertSettings()) // stop purging
      .then(() => Promise.all([requestPurges('user1'), requestPurges('user2')]))
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        // reverse purges
        chai.expect(purgedDocsUser1.purged_ids).to.have.members(['report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(purgedDocsUser2.purged_ids).to.have.members(['report1', 'report3', 'report4', 'message1', 'message3']);
      })
      .then(() => Promise.all([
        requestChanges('user1', { initial_replication: true }),
        requestChanges('user2', { initial_replication: true }),
      ]))
      .then(([user1Changes, user2Changes]) => {
        const user1ChangeIds = getChangeIds(user1Changes.results);
        const user2ChangeIds = getChangeIds(user2Changes.results);

        chai.expect(user1ChangeIds)
          .to.include.members(['clinic1', 'contact1', 'report1', 'report3', 'report4', 'message1', 'message3']);
        chai.expect(user1ChangeIds)
          .to.not.include('report2')
          .and.not.include('report5')
          .and.not.include('report6')
          .and.not.include('message2')
          .and.not.include('message4');

        chai.expect(user2ChangeIds)
          .to.include.members(['clinic1', 'contact1', 'report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(user2ChangeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3');
      });
  });

  it('should get changes from checkpointer', () => {
    let seqUser1;
    let seqUser2;

    return Promise
      .all([requestPurges('user1'), requestPurges('user2')])
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        // reverse purges
        chai.expect(purgedDocsUser1.purged_ids).to.have.members(['report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(purgedDocsUser2.purged_ids).to.have.members(['report1', 'report3', 'report4', 'message1', 'message3']);
        seqUser1 = purgedDocsUser1.last_seq;
        seqUser2 = purgedDocsUser2.last_seq;
      })
      .then(() => Promise.all([
        writePurgeCheckpoint('user1', seqUser1),
        writePurgeCheckpoint('user2', seqUser2),
      ]))
      .then(() => Promise.all([requestPurges('user1'), requestPurges('user2')]))
      .then(([purgedDocsUser1, purgedDocsUser2]) => {
        chai.expect(purgedDocsUser1).to.deep.equal({ purged_ids: [], last_seq: seqUser1 });
        chai.expect(purgedDocsUser2).to.deep.equal({ purged_ids: [], last_seq: seqUser2 });
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
      .then(() => requestChanges('user1', { initial_replication: true }))
      .then(result => {
        const changeIds = getChangeIds(result.results);
        chai.expect(changeIds)
          .to.include.members(['clinic1', 'contact1', 'report2', 'report5', 'report6', 'message2', 'message4']);
        chai.expect(changeIds)
          .to.not.include('report1')
          .and.not.include('report3')
          .and.not.include('report4')
          .and.not.include('message1')
          .and.not.include('message3');
      })
      .then(() => requestPurges('user1'))
      .then(purgedDocs => {
        chai.expect(purgedDocs.purged_ids).to.have.members(['report1', 'report3', 'report4', 'message1', 'message3']);
      })
      .then(() => writePurgeCheckpoint('user1'))
      .then(() => requestPurges('user1'))
      .then(purgedDocs => {
        chai.expect(purgedDocs.purged_ids.length).to.equal(0);
      });
  });
});
