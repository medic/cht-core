const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');

const VIEW_INDEXES_BY_DB = {
  'medic-test': [
    'medic',
    'medic-admin',
    'medic-client',
    'medic-conflicts',
    'medic-sms',
  ],
  'medic-test-sentinel': ['sentinel'],
  'medic-test-users-meta': ['users-meta'],
  _users: ['users'],
};

const NOUVEAU_INDEXES_BY_DB = {
  'medic-test': ['medic/contacts_by_freetext', 'medic/reports_by_freetext'],
};

const getAppVersion = async () => {
  const deployInfo = await utils.request({ path: '/api/deploy-info' });
  return deployInfo.version;
};

const getCouchDBVersion = async () => {
  const serverInfo = await getInfo('');
  return serverInfo.version;
};

const getInfo = (db) => utils.request({ path: `/${db}` });
const getUpdateSeq = (info) => parseInt(info.update_seq.split('-')[0]);
const getNouveauIndexInfo = (db, name) => {
  const dbName = db.replace('-test', '');
  const [ddocName, indexName] = name.split('/');
  return utils.request({ path: `/${dbName}/_design/${ddocName}/_nouveau_info/${indexName}` });
};

const getExpectedViewIndexes = (db) => {
  return VIEW_INDEXES_BY_DB[db].map(viewIndex => ({
    name: viewIndex
  }));
};

const getExpectedNouveauIndex = async (db, name) => {
  const { search_index: { num_docs } } = await getNouveauIndexInfo(db, name);
  return {
    name,
    doc_count: num_docs,
  };
};

const getExpectedNouveauIndexes = (db) => {
  const indexes = NOUVEAU_INDEXES_BY_DB[db] || [];
  return Promise.all(indexes.map((name) => getExpectedNouveauIndex(db, name)));
};

const INDETERMINATE_FIELDS = ['current', 'uptime', 'date', 'fragmentation', 'node', 'sizes', 'file_size'];

const assertCouchDbDataSizeFields = (couchData) => {
  chai.expect(couchData.fragmentation).to.be.gte(0);
  chai.expect(couchData.sizes.active).to.be.gte(0);
  chai.expect(couchData.sizes.file).to.be.gte(0);

  const expectedViewIndexNames = VIEW_INDEXES_BY_DB[couchData.name];
  chai.expect(couchData.view_indexes).to.have.lengthOf(expectedViewIndexNames.length);
  couchData.view_indexes.forEach(viewIndex => {
    chai.expect(viewIndex.sizes.active).to.be.gte(0);
    chai.expect(viewIndex.sizes.file).to.be.gte(0);
  });

  const expectedNouveauIndexNames = NOUVEAU_INDEXES_BY_DB[couchData.name] || [];
  chai.expect(couchData.nouveau_indexes).to.have.lengthOf(expectedNouveauIndexNames.length);
  couchData.nouveau_indexes.forEach(nouveauIndex => chai.expect(nouveauIndex.file_size).to.be.gte(0));
};

const assertIndeterminateFields = (result) => {
  // Cannot have precise expectations about the values of these fields
  chai.expect(result.date.current).to.be.gt(0);
  chai.expect(result.date.uptime).to.be.gt(0);
  chai.expect(result.version.node).to.be.a('string');
  const { couchdb: { medic, sentinel, usersmeta, users } } = result;
  [medic, sentinel, usersmeta, users].forEach(assertCouchDbDataSizeFields);
};

describe('monitoring', () => {
  beforeEach(() => sentinelUtils.waitForSentinel());
  afterEach(() => utils.revertDb([], true));

  describe('v1', () => {
    it('should return empty values for empty db', async () => {
      const medicInfo = await getInfo('medic');
      const sentinelInfo = await getInfo('medic-test-sentinel');
      const usersMetaInfo = await getInfo('medic-test-users-meta');
      const usersInfo = await getInfo('_users');

      const result = await utils.request({ path: '/api/v1/monitoring' });

      chai.expect(result).excludingEvery(INDETERMINATE_FIELDS).to.deep.equal({
        version: {
          app: await getAppVersion(),
          couchdb: await getCouchDBVersion(),
        },
        couchdb: {
          medic: {
            name: 'medic-test',
            update_sequence: getUpdateSeq(medicInfo),
            doc_count: medicInfo.doc_count,
            doc_del_count: medicInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('medic-test'),
            nouveau_indexes: await getExpectedNouveauIndexes('medic-test'),
          },
          sentinel: {
            name: 'medic-test-sentinel',
            update_sequence: getUpdateSeq(sentinelInfo),
            doc_count: sentinelInfo.doc_count,
            doc_del_count: sentinelInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('medic-test-sentinel'),
            nouveau_indexes: await getExpectedNouveauIndexes('medic-test-sentinel'),
          },
          usersmeta: {
            name: 'medic-test-users-meta',
            update_sequence: getUpdateSeq(usersMetaInfo),
            doc_count: usersMetaInfo.doc_count,
            doc_del_count: usersMetaInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('medic-test-users-meta'),
            nouveau_indexes: await getExpectedNouveauIndexes('medic-test-users-meta'),
          },
          users: {
            name: '_users',
            update_sequence: getUpdateSeq(usersInfo),
            doc_count: usersInfo.doc_count,
            doc_del_count: usersInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('_users'),
            nouveau_indexes: await getExpectedNouveauIndexes('_users'),
          },
        },
        sentinel: {
          backlog: await sentinelUtils.getBacklogCount(),
        },
        messaging: {
          outgoing: {
            state: {
              due: 0,
              scheduled: 0,
              muted: 0,
              failed: 0,
              delivered: 0,
            }
          }
        },
        outbound_push: {
          backlog: 0,
        },
        feedback: {
          count: 0,
        },
        conflict: {
          count: 0,
        },
        replication_limit: {
          count: 0,
        },
        connected_users: {
          count: 0, //not logged in browser
        },
      });

      assertIndeterminateFields(result);
    });
  });

  describe('v2', () => {
    it('should return empty values for empty db', async () => {
      const medicInfo = await getInfo('medic');
      const sentinelInfo = await getInfo('medic-test-sentinel');
      const usersMetaInfo = await getInfo('medic-test-users-meta');
      const usersInfo = await getInfo('_users');

      const result = await utils.request({ path: '/api/v2/monitoring' });
      chai.expect(result).excludingEvery(INDETERMINATE_FIELDS).to.deep.equal({
        version: {
          app: await getAppVersion(),
          couchdb: await getCouchDBVersion(),
        },
        couchdb: {
          medic: {
            name: 'medic-test',
            update_sequence: getUpdateSeq(medicInfo),
            doc_count: medicInfo.doc_count,
            doc_del_count: medicInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('medic-test'),
            nouveau_indexes: await getExpectedNouveauIndexes('medic-test'),
          },
          sentinel: {
            name: 'medic-test-sentinel',
            update_sequence: getUpdateSeq(sentinelInfo),
            doc_count: sentinelInfo.doc_count,
            doc_del_count: sentinelInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('medic-test-sentinel'),
            nouveau_indexes: await getExpectedNouveauIndexes('medic-test-sentinel'),
          },
          usersmeta: {
            name: 'medic-test-users-meta',
            update_sequence: getUpdateSeq(usersMetaInfo),
            doc_count: usersMetaInfo.doc_count,
            doc_del_count: usersMetaInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('medic-test-users-meta'),
            nouveau_indexes: await getExpectedNouveauIndexes('medic-test-users-meta'),
          },
          users: {
            name: '_users',
            update_sequence: getUpdateSeq(usersInfo),
            doc_count: usersInfo.doc_count,
            doc_del_count: usersInfo.doc_del_count,
            view_indexes: getExpectedViewIndexes('_users'),
            nouveau_indexes: await getExpectedNouveauIndexes('_users'),
          },
        },
        sentinel: {
          backlog: await sentinelUtils.getBacklogCount(),
        },
        messaging: {
          outgoing: {
            total: {
              due: 0,
              scheduled: 0,
              muted: 0,
              failed: 0,
              delivered: 0,
            },
            seven_days: {
              due: 0,
              scheduled: 0,
              muted: 0,
              failed: 0,
              delivered: 0,
            },
            last_hundred: {
              pending: {
                pending: 0,
                'forwarded-to-gateway': 0,
                'received-by-gateway': 0,
                'forwarded-by-gateway': 0,
              },
              final: {
                sent: 0,
                delivered: 0,
                failed: 0,
              },
              muted: {
                denied: 0,
                cleared: 0,
                muted: 0,
                duplicate: 0,
              }
            }
          }
        },
        outbound_push: {
          backlog: 0,
        },
        feedback: {
          count: 0,
        },
        conflict: {
          count: 0,
        },
        replication_limit: {
          count: 0,
        },
        connected_users: {
          count: 0,
        },
      });

      assertIndeterminateFields(result);
    });
  });
});
