const sinon = require('sinon');
const chai = require('chai');
const request = require('@medic/couch-request');
const _ = require('lodash');

const db = require('../../../src/db');
const environment = require('@medic/environment');
const deployInfo = require('../../../src/services/deploy-info');
const service = require('../../../src/services/monitoring');
const { getBundledDdocs } = require('../../../src/services/setup/utils');
const { DATABASES } = require('../../../src/services/setup/databases');

let clock;

const dbInfos = [
  {
    info: {
      db_name: 'mydb',
      update_seq: '100-abc',
      doc_count: 20,
      doc_del_count: 10,
      compact_running: true,
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
      compact_running: false,
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
      compact_running: true,
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
      compact_running: false,
      sizes: {
        active: 500,
        file: 501
      }
    }
  }
];

const VIEW_INDEXES_BY_DB = {
  [`${environment.db}`]: [
    'medic',
    'medic-admin',
    'medic-client',
    'medic-conflicts',
    'medic-scripts',
    'medic-sms',
  ],
  [`${environment.db}-sentinel`]: ['sentinel'],
  [`${environment.db}-users-meta`]: ['users-meta'],
  '_users': ['users'],
};

const VIEW_INDEX_INFO_BY_DESIGN = {
  'medic': {
    name: 'medic',
    view_index: {
      compact_running: true,
      updater_running: true,
      sizes: {
        active: 600,
        file: 7007
      }
    }
  },
  'medic-admin': {
    name: 'medic-admin',
    view_index: {
      compact_running: false,
      updater_running: true,
      sizes: {
        active: 6533400,
        file: 7005334
      }
    }
  },
  'medic-client': {
    name: 'medic-client',
    view_index: {
      compact_running: true,
      updater_running: false,
      sizes: {
        active: 22600,
        file: 33700
      }
    }
  },
  'medic-conflicts': {
    name: 'medic-conflicts',
    view_index: {
      compact_running: false,
      updater_running: false,
      sizes: {
        active: 6,
        file: 7
      }
    }
  },
  'medic-scripts': {
    name: 'medic-scripts',
    view_index: {
      compact_running: true,
      updater_running: true,
      sizes: {
        active: 1,
        file: 1
      }
    }
  },
  'medic-sms': {
    name: 'medic-sms',
    view_index: {
      compact_running: false,
      updater_running: true,
      sizes: {
        active: 100,
        file: 700
      }
    }
  },
  'sentinel': {
    name: 'sentinel',
    view_index: {
      compact_running: true,
      updater_running: false,
      sizes: {
        active: 700,
        file: 700
      }
    }
  },
  'users-meta': {
    name: 'users-meta',
    view_index: {
      compact_running: false,
      updater_running: false,
      sizes: {
        active: 600,
        file: 700
      }
    }
  },
  'users': {
    name: 'users',
    view_index: {
      compact_running: true,
      updater_running: true,
      sizes: {
        active: 600,
        file: 700
      }
    }
  }
};

const setUpMocks = () => {
  sinon.stub(deployInfo, 'get').resolves({ version: '5.3.2' });
  sinon.stub(request, 'get')
    .withArgs(sinon.match({ url: environment.serverUrl })).resolves({ version: 'v3.3.3' })
    .withArgs(sinon.match({ url: `${environment.couchUrl}/_changes` })).resolves({ pending: 24 });
  Object.keys(VIEW_INDEXES_BY_DB).forEach(dbName => {
    VIEW_INDEXES_BY_DB[dbName].forEach(designDoc => {
      request.get
        .withArgs(sinon.match({ url: `${environment.serverUrl}/${dbName}/_design/${designDoc}/_info` }))
        .resolves(VIEW_INDEX_INFO_BY_DESIGN[designDoc]);
    });
  });
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

const getExpectedViewIndex = (dbName) => {
  const result  = {};
  VIEW_INDEXES_BY_DB[dbName].forEach(designDoc => {
    result[designDoc] = {
      name: VIEW_INDEX_INFO_BY_DESIGN[designDoc].name,
      compact_running: VIEW_INDEX_INFO_BY_DESIGN[designDoc].view_index.compact_running,
      updater_running: VIEW_INDEX_INFO_BY_DESIGN[designDoc].view_index.updater_running,
      sizes: VIEW_INDEX_INFO_BY_DESIGN[designDoc].view_index.sizes,
    };
  });
  return result;
};

const getExpectedEmptyViewIndex = (dbName) => {
  const result  = {};
  VIEW_INDEXES_BY_DB[dbName].forEach(designDoc => {
    result[designDoc] = {
      name: '',
      compact_running: false,
      updater_running: false,
      sizes: {
        active: -1,
        file: -1
      },
    };
  });
  return result;
};

const getCurrentDdocNames = (db) => getBundledDdocs(db)
  .then(ddocs => ddocs
    .map(ddoc => ddoc._id)
    .map(ddocId => ddocId.split('/')[1]));

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
          compact_running: true,
          doc_count: 20,
          doc_del_count: 10,
          fragmentation: 1.074747453489672,
          name: 'mydb',
          update_sequence: 100,
          sizes: {
            active: 600,
            file: 700
          },
          view_index: getExpectedViewIndex(environment.db)
        },
        sentinel: {
          compact_running: false,
          doc_count: 30,
          doc_del_count: 20,
          fragmentation: 1,
          name: 'mydb-sentinel',
          update_sequence: 200,
          sizes: {
            active: 500,
            file: 500
          },
          view_index: getExpectedViewIndex(`${environment.db}-sentinel`)
        },
        users: {
          compact_running: false,
          doc_count: 50,
          doc_del_count: 40,
          fragmentation: 1.0918181818181818,
          name: '_users',
          update_sequence: 400,
          sizes: {
            active: 500,
            file: 501
          },
          view_index: getExpectedViewIndex('_users')
        },
        usersmeta: {
          compact_running: true,
          doc_count: 40,
          doc_del_count: 30,
          fragmentation: 5.181818181818182,
          name: 'mydb-users-meta',
          update_sequence: 300,
          sizes: {
            active: 500,
            file: 5000
          },
          view_index: getExpectedViewIndex(`${environment.db}-users-meta`)
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
      chai.expect(request.get.args).to.deep.equalInAnyOrder([
        [{ json: true, url: environment.serverUrl }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-admin/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-client/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-conflicts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-scripts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-sms/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-sentinel/_design/sentinel/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-users-meta/_design/users-meta/_info` }],
        [{ json: true, url: `${environment.serverUrl}/_users/_design/users/_info` }],
        [{
          json: true,
          url: `${environment.serverUrl}medic/_changes`,
          qs: {
            limit: 0,
            since: undefined
          }
        }],
      ]);
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
          compact_running: true,
          doc_count: 20,
          doc_del_count: 10,
          fragmentation: 1.074747453489672,
          name: 'mydb',
          update_sequence: 100,
          sizes: {
            active: 600,
            file: 700
          },
          view_index: getExpectedViewIndex(environment.db)
        },
        sentinel: {
          compact_running: false,
          doc_count: 30,
          doc_del_count: 20,
          fragmentation: 1,
          name: 'mydb-sentinel',
          update_sequence: 200,
          sizes: {
            active: 500,
            file: 500
          },
          view_index: getExpectedViewIndex(`${environment.db}-sentinel`)
        },
        users: {
          compact_running: false,
          doc_count: 50,
          doc_del_count: 40,
          fragmentation: 1.0918181818181818,
          name: '_users',
          update_sequence: 400,
          sizes: {
            active: 500,
            file: 501
          },
          view_index: getExpectedViewIndex('_users')
        },
        usersmeta: {
          compact_running: true,
          doc_count: 40,
          doc_del_count: 30,
          fragmentation: 5.181818181818182,
          name: 'mydb-users-meta',
          update_sequence: 300,
          sizes: {
            active: 500,
            file: 5000
          },
          view_index: getExpectedViewIndex(`${environment.db}-users-meta`)
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
      chai.expect(request.get.args).to.deep.equalInAnyOrder([
        [{ json: true, url: environment.serverUrl }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-admin/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-client/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-conflicts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-scripts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-sms/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-sentinel/_design/sentinel/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-users-meta/_design/users-meta/_info` }],
        [{ json: true, url: `${environment.serverUrl}/_users/_design/users/_info` }],
        [{
          json: true,
          url: `${environment.serverUrl}medic/_changes`,
          qs: {
            limit: 0,
            since: undefined
          }
        }],
      ]);
    });
  });

  it('v1 handles errors gracefully', () => {
    sinon.stub(deployInfo, 'get').rejects();
    sinon.stub(request, 'get').rejects();
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
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex(environment.db)
        },
        sentinel: {
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex(`${environment.db}-sentinel`)
        },
        users: {
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex('_users')
        },
        usersmeta: {
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex(`${environment.db}-users-meta`)
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
      chai.expect(request.get.args).to.deep.equalInAnyOrder([
        [{ json: true, url: environment.serverUrl }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-admin/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-client/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-conflicts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-scripts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-sms/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-sentinel/_design/sentinel/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-users-meta/_design/users-meta/_info` }],
        [{ json: true, url: `${environment.serverUrl}/_users/_design/users/_info` }],
      ]);
    });
  });

  it('v2 handles errors gracefully', () => {
    sinon.stub(deployInfo, 'get').rejects();
    sinon.stub(request, 'get').rejects();
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
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex(environment.db)
        },
        sentinel: {
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex(`${environment.db}-sentinel`)
        },
        users: {
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex('_users')
        },
        usersmeta: {
          compact_running: false,
          doc_count: -1,
          doc_del_count: -1,
          fragmentation: -1,
          name: '',
          update_sequence: -1,
          sizes: {
            active: -1,
            file: -1
          },
          view_index: getExpectedEmptyViewIndex(`${environment.db}-users-meta`)
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
      chai.expect(request.get.args).to.deep.equalInAnyOrder([
        [{ json: true, url: environment.serverUrl }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-admin/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-client/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-conflicts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-scripts/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic/_design/medic-sms/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-sentinel/_design/sentinel/_info` }],
        [{ json: true, url: `${environment.serverUrl}/medic-users-meta/_design/users-meta/_info` }],
        [{ json: true, url: `${environment.serverUrl}/_users/_design/users/_info` }],
      ]);
    });
  });

  it('v1 handles empty reduce response correctly', () => {
    sinon.stub(deployInfo, 'get').resolves({ version: '5.3.2' });
    sinon.stub(request, 'get').withArgs(sinon.match({ url: environment.serverUrl }))
      .resolves({ version: 'v3.3.3' });
    request.get.rejects();
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

  it('includes view_index data for all supported databases', async () => {
    for (const dbName of [
      `${environment.db}`,
      `${environment.db}-sentinel`,
      `${environment.db}-users-meta`,
      '_users',
    ]) {
      const db = DATABASES.find(db => db.name === dbName);
      const ddocNames = await getCurrentDdocNames(db);
      chai.expect(ddocNames).to.not.be.empty;
      // If you have added a new design doc, you should include it in the view_index monitoring!
      chai.expect(ddocNames).to.deep.equalInAnyOrder(VIEW_INDEXES_BY_DB[dbName]);
    }
  });
});
