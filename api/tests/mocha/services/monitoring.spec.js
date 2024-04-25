const sinon = require('sinon');
const chai = require('chai');
const request = require('@medic/couch-request');
const _ = require('lodash');

const db = require('../../../src/db');
const environment = require('../../../src/environment');
const deployInfo = require('../../../src/services/deploy-info');
const service = require('../../../src/services/monitoring');

let clock;

const dbInfos = [
  {
    info: {
      db_name: 'mydb',
      update_seq: '100-abc',
      doc_count: 20,
      doc_del_count: 10,
      sizes: {
        active: 600,
        file: 700
      }
    }
  },
  {
    info: {
      db_name: 'mydb-sentinel',
      update_seq: '200-def',
      doc_count: 30,
      doc_del_count: 20,
      sizes: {
        active: 500,
        file: 500
      }
    }
  },
  {
    info: {
      db_name: 'mydb-users-meta',
      update_seq: '300-hij',
      doc_count: 40,
      doc_del_count: 30,
      sizes: {
        active: 500,
        file: 5000
      }
    }
  },
  {
    info: {
      db_name: '_users',
      update_seq: '400-klm',
      doc_count: 50,
      doc_del_count: 40,
      sizes: {
        active: 500,
        file: 501
      }
    }
  }
];

const setUpMocks = () => {
  sinon.stub(deployInfo, 'get').resolves({ version: '5.3.2' });
  sinon.stub(request, 'get')
    .withArgs(sinon.match({ url: environment.serverUrl })).resolves({ version: 'v3.3.3' })
    .withArgs(sinon.match({ url: `${environment.couchUrl}/_changes` })).resolves({ pending: 24 });
  sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` }))
    .resolves(dbInfos);
  sinon.stub(db.sentinel, 'get').withArgs('_local/transitions-seq')
    .resolves({ processed_seq: '50-xyz' });
  const medicQuery = sinon.stub(db.medic, 'query');
  medicQuery.withArgs('medic-admin/message_queue')
    .resolves({ rows: [] })
    .onCall(0).resolves({ rows: [
      { key: [ 'scheduled' ], value: 15 },
      { key: [ 'due' ], value: 3 },
      { key: [ 'failed' ], value: 20 },
      { key: [ 'delivered' ], value: 10 },
    ] });
  medicQuery
    .withArgs('medic-admin/message_queue', sinon.match({ start_key: sinon.match.array.startsWith(['due'])}))
    .resolves({ rows: [{ key: undefined, value: 20 }] })
    .withArgs('medic-admin/message_queue', sinon.match({ start_key: sinon.match.array.startsWith(['delivered'])}))
    .resolves({ rows: [{ key: undefined, value: 15 }] })
    .withArgs('medic-admin/message_queue', sinon.match({ start_key: sinon.match.array.startsWith(['failed'])}))
    .resolves({ rows: [{ key: undefined, value: 5 }] });

  medicQuery.withArgs('medic-conflicts/conflicts')
    .resolves({ rows: [ { value: 40 } ] });
  sinon.stub(db.sentinel, 'query')
    .resolves({ rows: [ { value: 3 } ] });
  sinon.stub(db.medicUsersMeta, 'query')
    .resolves({ rows: [ { value: 2 } ] });
  sinon.stub(db.medicLogs, 'query')
    .withArgs('logs/replication_limit')
    .resolves({ rows: [ { value: 1 } ] })
    .withArgs('logs/connected_users', { startkey: 0, reduce: true })
    .resolves({ rows: [ { value: 2 } ] });
};

const generateRows = (statusCounters) => {
  const rows = [];
  Object
    .entries(statusCounters)
    .forEach(([status, counter]) => {
      rows.push(...Array.from({ length: counter }).map(() => ({ key: ['group', 100, status] })));
    });
  return _.shuffle(rows);
};

const setupV2Mocks = (statusCounters) => {
  const view = 'medic-sms/messages_by_last_updated_state';
  const finalRows = generateRows({
    sent: statusCounters.sent,
    delivered: statusCounters.delivered,
    failed: statusCounters.failed,
  });
  const pendingRows = generateRows({
    pending: statusCounters.pending,
    'forwarded-to-gateway': statusCounters['forwarded-to-gateway'],
  });
  const mutedRows = generateRows({
    denied: statusCounters.denied,
    cleared: statusCounters.cleared,
  });
  db.medic.query
    .withArgs(view, sinon.match({ start_key: sinon.match.array.startsWith(['final']) }))
    .resolves({ rows: finalRows })
    .withArgs(view, sinon.match({ start_key: sinon.match.array.startsWith(['pending']) }))
    .resolves({ rows: pendingRows })
    .withArgs(view, sinon.match({ start_key: sinon.match.array.startsWith(['muted']) }))
    .resolves({ rows: mutedRows });
};

describe('Monitoring service', () => {

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('v1 returns successfully', () => {
    setUpMocks();

    return service.jsonV1().then(actual => {
      chai.expect(request.post.callCount).to.equal(1);
      chai.expect(actual.version).to.deep.equal({
        app: '5.3.2',
        node: process.version,
        couchdb: 'v3.3.3'
      });
      chai.expect(actual.couchdb).to.deep.equal({
        medic: {
          doc_count: 20,
          doc_del_count: 10,
          fragmentation: 1.1666666666666667,
          name: 'mydb',
          update_sequence: 100
        },
        sentinel: {
          doc_count: 30,
          doc_del_count: 20,
          fragmentation: 1,
          name: 'mydb-sentinel',
          update_sequence: 200
        },
        users: {
          doc_count: 50,
          doc_del_count: 40,
          fragmentation: 1.002,
          name: '_users',
          update_sequence: 400
        },
        usersmeta: {
          doc_count: 40,
          doc_del_count: 30,
          fragmentation: 10,
          name: 'mydb-users-meta',
          update_sequence: 300
        }
      });
      chai.expect(actual.messaging).to.deep.equal({
        outgoing: {
          state: {
            due: 3,
            scheduled: 15,
            muted: 0,
            failed: 20,
            delivered: 10,
          },
        },
      });
      chai.expect(actual.sentinel).to.deep.equal({ backlog: 24 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: 3 });
      chai.expect(actual.feedback).to.deep.equal({ count: 2 });
      chai.expect(actual.conflict).to.deep.equal({ count: 40 });
      chai.expect(actual.date.current).to.equal(0);
      chai.expect(actual.replication_limit.count).to.equal(1);
    });
  });

  it('v2 returns successfully', () => {
    setUpMocks();
    setupV2Mocks({
      pending: 30,
      'forwarded-to-gateway': 70,
      sent: 20,
      delivered: 70,
      failed: 10,
      denied: 20,
      cleared: 30,
    });

    return service.jsonV2().then(actual => {
      chai.expect(request.post.callCount).to.equal(1);
      chai.expect(actual.version).to.deep.equal({
        app: '5.3.2',
        node: process.version,
        couchdb: 'v3.3.3'
      });
      chai.expect(actual.couchdb).to.deep.equal({
        medic: {
          doc_count: 20,
          doc_del_count: 10,
          fragmentation: 1.1666666666666667,
          name: 'mydb',
          update_sequence: 100
        },
        sentinel: {
          doc_count: 30,
          doc_del_count: 20,
          fragmentation: 1,
          name: 'mydb-sentinel',
          update_sequence: 200
        },
        users: {
          doc_count: 50,
          doc_del_count: 40,
          fragmentation: 1.002,
          name: '_users',
          update_sequence: 400
        },
        usersmeta: {
          doc_count: 40,
          doc_del_count: 30,
          fragmentation: 10,
          name: 'mydb-users-meta',
          update_sequence: 300
        }
      });
      chai.expect(actual.messaging).to.deep.equal({
        outgoing: {
          total: {
            due: 3,
            scheduled: 15,
            muted: 0,
            failed: 20,
            delivered: 10,
          },
          seven_days: {
            due: 20,
            scheduled: 0,
            muted: 0,
            failed: 5,
            delivered: 15,
          },
          last_hundred: {
            final: {
              sent: 20,
              delivered: 70,
              failed: 10,
            },
            pending: {
              pending: 30,
              'forwarded-to-gateway': 70,
              'forwarded-by-gateway': 0,
              'received-by-gateway': 0,
            },
            muted: {
              denied: 20,
              cleared: 30,
              duplicate: 0,
              muted: 0,
            },
          },
        },
      });
      chai.expect(actual.sentinel).to.deep.equal({ backlog: 24 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: 3 });
      chai.expect(actual.feedback).to.deep.equal({ count: 2 });
      chai.expect(actual.conflict).to.deep.equal({ count: 40 });
      chai.expect(actual.date.current).to.equal(0);
      chai.expect(actual.replication_limit.count).to.equal(1);
      chai.expect(actual.connected_users.count).to.equal(2);
    });
  });

  it('v1 handles errors gracefully', () => {
    sinon.stub(deployInfo, 'get').rejects();
    sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl })).rejects();
    sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` })).rejects();
    sinon.stub(db.sentinel, 'get').withArgs('_local/transitions-seq').rejects();
    sinon.stub(db.medic, 'query').rejects();
    sinon.stub(db.sentinel, 'query').rejects();
    sinon.stub(db.medicUsersMeta, 'query').rejects();
    sinon.stub(db.medicLogs, 'query')
      .withArgs('logs/replication_limit')
      .rejects()
      .withArgs('logs/connected_users', { startkey: 0, reduce: true })
      .rejects();

    return service.jsonV1().then(actual => {
      chai.expect(actual.version).to.deep.equal({
        app: '',
        node: process.version,
        couchdb: ''
      });
      chai.expect(actual.couchdb).to.deep.equal({
        medic: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        },
        sentinel: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        },
        users: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        },
        usersmeta: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        }
      });
      chai.expect(actual.messaging).to.deep.equal({
        outgoing: {
          state: {
            due: -1,
            scheduled: -1,
            muted: -1,
            failed: -1,
            delivered: -1,
          },
        },
      });
      chai.expect(actual.sentinel).to.deep.equal({ backlog: -1 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: -1 });
      chai.expect(actual.feedback).to.deep.equal({ count: -1 });
      chai.expect(actual.replication_limit).to.deep.equal({ count: -1 });
    });
  });

  it('v2 handles errors gracefully', () => {
    sinon.stub(deployInfo, 'get').rejects();
    sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl })).rejects();
    sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` })).rejects();
    sinon.stub(db.sentinel, 'get').withArgs('_local/transitions-seq').rejects();
    sinon.stub(db.medic, 'query').rejects();
    sinon.stub(db.sentinel, 'query').rejects();
    sinon.stub(db.medicUsersMeta, 'query').rejects();
    sinon.stub(db.medicLogs, 'query').rejects();

    return service.jsonV2().then(actual => {
      chai.expect(actual.version).to.deep.equal({
        app: '',
        node: process.version,
        couchdb: ''
      });
      chai.expect(actual.couchdb).to.deep.equal({
        medic: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        },
        sentinel: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        },
        users: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        },
        usersmeta: {
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1
        }
      });
      chai.expect(actual.messaging).to.deep.equal({
        outgoing: {
          total: {
            due: -1,
            scheduled: -1,
            muted: -1,
            failed: -1,
            delivered: -1,
          },
          seven_days: {
            due: -1,
            scheduled: -1,
            muted: -1,
            failed: -1,
            delivered: -1,
          },
          last_hundred: {
            final: {
              sent: -1,
              delivered: -1,
              failed: -1,
            },
            pending: {
              pending: -1,
              'forwarded-to-gateway': -1,
              'forwarded-by-gateway': -1,
              'received-by-gateway': -1,
            },
            muted: {
              denied: -1,
              cleared: -1,
              duplicate: -1,
              muted: -1,
            },
          },
        },
      });
      chai.expect(actual.sentinel).to.deep.equal({ backlog: -1 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: -1 });
      chai.expect(actual.feedback).to.deep.equal({ count: -1 });
      chai.expect(actual.replication_limit).to.deep.equal({ count: -1 });
      chai.expect(actual.connected_users).to.deep.equal({ count: -1 });
    });
  });

  it('v1 handles empty reduce response correctly', () => {
    sinon.stub(deployInfo, 'get').resolves({ version: '5.3.2' });
    sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl }))
      .resolves({ version: 'v3.3.3' });
    sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` }))
      .resolves(dbInfos);
    sinon.stub(db.sentinel, 'get').withArgs('_local/transitions-seq')
      .resolves({ processed_seq: '50-xyz' });
    sinon.stub(db.medic, 'query')
      .resolves({ rows: [
        { key: [ 'scheduled' ], value: 15 },
        { key: [ 'due' ], value: 3 },
      ] });
    // empty rows is how couchdb responds to reducing with no rows - this should return 0
    sinon.stub(db.sentinel, 'query').resolves({ rows: [] });
    sinon.stub(db.medicUsersMeta, 'query').resolves({ rows: [] });
    sinon.stub(db.medicLogs, 'query').resolves({ rows: [] });
    return service.jsonV1().then(actual => {
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: 0 });
      chai.expect(actual.feedback).to.deep.equal({ count: 0 });
    });
  });

});
