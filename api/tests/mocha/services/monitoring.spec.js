const sinon = require('sinon');
const chai = require('chai');
const request = require('request-promise-native');

const db = require('../../../src/db');
const environment = require('../../../src/environment');
const service = require('../../../src/services/monitoring');
const replicationLimitLogService = require('../../../src/services/replication-limit-log');

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
  sinon.stub(db.medic, 'get').withArgs('_design/medic')
    .resolves({ deploy_info: { version: '5.3.2' } });
  sinon.stub(request, 'get')
    .withArgs(sinon.match({ url: environment.serverUrl })).resolves({ version: 'v3.3.3' })
    .withArgs(sinon.match({ url: `${environment.couchUrl}/_changes` })).resolves({ pending: 24 });
  sinon.stub(request, 'post').withArgs(sinon.match({ url: `${environment.serverUrl}/_dbs_info` }))
    .resolves(dbInfos);
  sinon.stub(db.sentinel, 'get').withArgs('_local/sentinel-meta-data')
    .resolves({ processed_seq: '50-xyz' });
  const medicQuery = sinon.stub(db.medic, 'query');
  medicQuery.withArgs('medic-admin/message_queue')
    .resolves({ rows: [
      { key: [ 'scheduled' ], value: 15 },
      { key: [ 'due' ], value: 3 },
    ] });
  medicQuery.withArgs('medic-conflicts/conflicts')
    .resolves({ rows: [ { value: 40 } ] });
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
    sinon
      .stub(replicationLimitLogService, 'get')
      .resolves([
        { count: 5, limit: 10 },
        { count: 10, limit: 10 },
        { count: 15, limit: 10 }
      ]);
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
      chai.expect(actual.sentinel).to.deep.equal({ backlog: 24 });
      chai.expect(actual.outbound_push).to.deep.equal({ backlog: 3 });
      chai.expect(actual.feedback).to.deep.equal({ count: 2 });
      chai.expect(actual.conflict).to.deep.equal({ count: 40 });
      chai.expect(actual.date.current).to.equal(0);
      chai.expect(actual.replication_limit.logs).to.equal(1);
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
    sinon.stub(replicationLimitLogService, 'get').rejects();

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
      chai.expect(actual.replication_limit).to.deep.equal({ logs: -1 });
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

});
