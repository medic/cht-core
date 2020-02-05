const sinon = require('sinon');
const chai = require('chai');
const request = require('request-promise-native');

const serverUtils = require('../../../src/server-utils');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const controller = require('../../../src/controllers/monitoring');

const req = {};
let res;
let originalServerUrl;
let originalDb;

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

describe.only('Monitoring controller', () => {

  beforeEach(() => res = { json: sinon.stub() });

  afterEach(() => sinon.restore());

  it('returns successfully', () => {
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
    sinon.stub(db.sentinel, 'allDocs')
      .resolves({ rows: [ 'a', 'b', 'c' ] });
    return controller.get(req, res).then(() => {
      chai.expect(request.post.callCount).to.equal(1);
      chai.expect(request.post.args[0][0].body.keys)
        .to.deep.equal([ environment.db, `${environment.db}-sentinel`, `${environment.db}-users-meta`, '_users' ]);
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal({
        version: {
          app: '5.3.2',
          node: process.version,
          couchdb: 'v3.3.3'
        },
        couchdb: {
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
        },
        sentinel: {
          backlog: 50
        },
        messaging: {
          outgoing: {
            state: {
              due: 3,
              scheduled: 15,
              muted: 0
            }
          }
        },
        outbound_push: {
          backlog: 3
        },
        feedback: {
          count: 10
        }
      });
    });
  });

});

    // sinon.stub(serverUtils, 'error').returns();
      // chai.expect(serverUtils.error.callCount).to.equal(1);