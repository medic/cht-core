const sinon = require('sinon');
const chai = require('chai');
const request = require('request-promise-native');

const db = require('../../../src/db');
const environment = require('../../../src/environment');
const service = require('../../../src/services/monitoring');

let clock;

const dbInfos = [
  {
    info: {
      db_name: 'mydb',
      update_seq: '100-abc',
      doc_count: 20,
      doc_del_count: 10,
      disk_size: 700,
      data_size: 600
    }
  },
  {
    info: {
      db_name: 'mydb-sentinel',
      update_seq: '200-def',
      doc_count: 30,
      doc_del_count: 20,
      disk_size: 500,
      data_size: 500
    }
  },
  {
    info: {
      db_name: 'mydb-users-meta',
      update_seq: '300-hij',
      doc_count: 40,
      doc_del_count: 30,
      disk_size: 5000,
      data_size: 500
    }
  },
  {
    info: {
      db_name: '_users',
      update_seq: '400-klm',
      doc_count: 50,
      doc_del_count: 40,
      disk_size: 501,
      data_size: 500
    }
  }
];

const setUpMocks = () => {
  sinon.stub(db.medic, 'get').withArgs('_design/medic')
    .resolves({ version: '5.3.2' });
  sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl }))
    .resolves({ version: 'v3.3.3' });
  sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` }))
    .resolves(dbInfos);
  sinon.stub(db.sentinel, 'get').withArgs('_local/sentinel-meta-data')
    .resolves({ processed_seq: '50-xyz' });
  sinon.stub(db.medic, 'query')
    .resolves({ rows: [
      { key: [ 'scheduled' ], value: 15 },
      { key: [ 'due' ], value: 3 },
    ] });
  sinon.stub(db.sentinel, 'query')
    .resolves({ rows: [ { value: 3 } ] });
  sinon.stub(db.medicUsersMeta, 'query')
    .resolves({ rows: [ { value: 2 } ] });
};

describe('Monitoring service', () => {

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('json returns successfully', () => {
    setUpMocks();
    return service.json().then(actual => {
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
            muted: 0
          }
        }
      });
      chai.expect(actual.sentinel).to.deep.equal({ backlog: 50 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: 3 });
      chai.expect(actual.feedback).to.deep.equal({ count: 2 });
      chai.expect(actual.date.current).to.equal(0);
    });
  });

  it('handles errors gracefully', () => {
    sinon.stub(db.medic, 'get').withArgs('_design/medic').rejects();
    sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl })).rejects();
    sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` })).rejects();
    sinon.stub(db.sentinel, 'get').withArgs('_local/sentinel-meta-data').rejects();
    sinon.stub(db.medic, 'query').rejects();
    sinon.stub(db.sentinel, 'query').rejects();
    sinon.stub(db.medicUsersMeta, 'query').rejects();
    return service.json().then(actual => {
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
            muted: -1
          }
        }
      });
      chai.expect(actual.sentinel).to.deep.equal({ backlog: -1 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: -1 });
      chai.expect(actual.feedback).to.deep.equal({ count: -1 });
    });
  });

  it('handles empty reduce response correctly', () => {
    sinon.stub(db.medic, 'get').withArgs('_design/medic')
      .resolves({ version: '5.3.2' });
    sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl }))
      .resolves({ version: 'v3.3.3' });
    sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` }))
      .resolves(dbInfos);
    sinon.stub(db.sentinel, 'get').withArgs('_local/sentinel-meta-data')
      .resolves({ processed_seq: '50-xyz' });
    sinon.stub(db.medic, 'query')
      .resolves({ rows: [
        { key: [ 'scheduled' ], value: 15 },
        { key: [ 'due' ], value: 3 },
      ] });
    // empty rows is how couchdb responds to reducing with no rows - this should return 0
    sinon.stub(db.sentinel, 'query').resolves({ rows: [] });
    sinon.stub(db.medicUsersMeta, 'query').resolves({ rows: [] });
    return service.json().then(actual => {
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: 0 });
      chai.expect(actual.feedback).to.deep.equal({ count: 0 });
    });
  });

  it('openMetrics returns successfully', () => {
    setUpMocks();
    return service.openMetrics().then(actual => {
      chai.expect(actual).to.equal(OPEN_METRICS_EXPECTED_OUTPUT);
    });
  });

  const OPEN_METRICS_EXPECTED_OUTPUT = `
# HELP couchdb_medic_doc_count The number of docs in the medic db
# TYPE couchdb_medic_doc_count gauge
couchdb_medic_doc_count 20

# HELP couchdb_medic_doc_del_count The number of deleted docs in the medic db
# TYPE couchdb_medic_doc_del_count gauge
couchdb_medic_doc_del_count 10

# HELP couchdb_medic_fragmentation The fragmentation of the medic db, lower is better, "1" is no fragmentation
# TYPE couchdb_medic_fragmentation gauge
couchdb_medic_fragmentation 1.1666666666666667

# HELP couchdb_medic_update_seq The number of changes in the medic db
# TYPE couchdb_medic_update_seq counter
couchdb_medic_update_seq 100

# HELP couchdb_sentinel_doc_count The number of docs in the sentinel db
# TYPE couchdb_sentinel_doc_count gauge
couchdb_sentinel_doc_count 30

# HELP couchdb_sentinel_doc_del_count The number of deleted docs in the sentinel db
# TYPE couchdb_sentinel_doc_del_count gauge
couchdb_sentinel_doc_del_count 20

# HELP couchdb_sentinel_fragmentation The fragmentation of the sentinel db, lower is better, "1" is no fragmentation
# TYPE couchdb_sentinel_fragmentation gauge
couchdb_sentinel_fragmentation 1

# HELP couchdb_sentinel_update_seq The number of changes in the sentinel db
# TYPE couchdb_sentinel_update_seq counter
couchdb_sentinel_update_seq 200

# HELP couchdb_usersmeta_doc_count The number of docs in the usersmeta db
# TYPE couchdb_usersmeta_doc_count gauge
couchdb_usersmeta_doc_count 40

# HELP couchdb_usersmeta_doc_del_count The number of deleted docs in the usersmeta db
# TYPE couchdb_usersmeta_doc_del_count gauge
couchdb_usersmeta_doc_del_count 30

# HELP couchdb_usersmeta_fragmentation The fragmentation of the usersmeta db, lower is better, "1" is no fragmentation
# TYPE couchdb_usersmeta_fragmentation gauge
couchdb_usersmeta_fragmentation 10

# HELP couchdb_usersmeta_update_seq The number of changes in the usersmeta db
# TYPE couchdb_usersmeta_update_seq counter
couchdb_usersmeta_update_seq 300

# HELP couchdb_users_doc_count The number of docs in the users db
# TYPE couchdb_users_doc_count gauge
couchdb_users_doc_count 50

# HELP couchdb_users_doc_del_count The number of deleted docs in the users db
# TYPE couchdb_users_doc_del_count gauge
couchdb_users_doc_del_count 40

# HELP couchdb_users_fragmentation The fragmentation of the users db, lower is better, "1" is no fragmentation
# TYPE couchdb_users_fragmentation gauge
couchdb_users_fragmentation 1.002

# HELP couchdb_users_update_seq The number of changes in the users db
# TYPE couchdb_users_update_seq counter
couchdb_users_update_seq 400

# HELP messaging_outgoing Messages in each state
# TYPE messaging_outgoing gauge
messaging_outgoing{state="due"} 3

# HELP messaging_outgoing Messages in each state
# TYPE messaging_outgoing gauge
messaging_outgoing{state="scheduled"} 15

# HELP messaging_outgoing Messages in each state
# TYPE messaging_outgoing gauge
messaging_outgoing{state="muted"} 0

# HELP sentinel_backlog Number of changes yet to be processed by Sentinel
# TYPE sentinel_backlog gauge
sentinel_backlog 50

# HELP outbound_push_backlog Number of changes yet to be sent by Outbound Push
# TYPE outbound_push_backlog gauge
outbound_push_backlog 3

# HELP feedback_doc Number of feedback docs being created indicative of client side errors
# TYPE feedback_doc count
feedback_doc 2
`;

});
