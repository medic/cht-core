const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');

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

describe('monitoring', () => {
  beforeEach(async () => {
    await sentinelUtils.skipToSeq();
    await sentinelUtils.waitForSentinel();
  });
  afterEach(() => utils.revertDb([], true));

  describe('v1', () => {
    it('should return empty values for empty db', async () => {
      const medicInfo = await getInfo('medic');
      const sentinelInfo = await getInfo('medic-test-sentinel');
      const usersMetaInfo = await getInfo('medic-test-users-meta');
      const usersInfo = await getInfo('_users');

      const result = await utils.request({ path: '/api/v1/monitoring' });
      chai.expect(result).excludingEvery(['current', 'uptime', 'date', 'fragmentation', 'node']).to.deep.equal({
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
          },
          sentinel: {
            name: 'medic-test-sentinel',
            update_sequence: getUpdateSeq(sentinelInfo),
            doc_count: sentinelInfo.doc_count,
            doc_del_count: sentinelInfo.doc_del_count,
          },
          usersmeta: {
            name: 'medic-test-users-meta',
            update_sequence: getUpdateSeq(usersMetaInfo),
            doc_count: usersMetaInfo.doc_count,
            doc_del_count: usersMetaInfo.doc_del_count,
          },
          users: {
            name: '_users',
            update_sequence: getUpdateSeq(usersInfo),
            doc_count: usersInfo.doc_count,
            doc_del_count: usersInfo.doc_del_count,
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
    });
  });

  describe('v2', () => {
    it('should return empty values for empty db', async () => {
      const medicInfo = await getInfo('medic');
      const sentinelInfo = await getInfo('medic-test-sentinel');
      const usersMetaInfo = await getInfo('medic-test-users-meta');
      const usersInfo = await getInfo('_users');

      const result = await utils.request({ path: '/api/v2/monitoring' });
      chai.expect(result).excludingEvery(['current', 'uptime', 'date', 'fragmentation', 'node']).to.deep.equal({
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
          },
          sentinel: {
            name: 'medic-test-sentinel',
            update_sequence: getUpdateSeq(sentinelInfo),
            doc_count: sentinelInfo.doc_count,
            doc_del_count: sentinelInfo.doc_del_count,
          },
          usersmeta: {
            name: 'medic-test-users-meta',
            update_sequence: getUpdateSeq(usersMetaInfo),
            doc_count: usersMetaInfo.doc_count,
            doc_del_count: usersMetaInfo.doc_del_count,
          },
          users: {
            name: '_users',
            update_sequence: getUpdateSeq(usersInfo),
            doc_count: usersInfo.doc_count,
            doc_del_count: usersInfo.doc_del_count,
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
    });
  });
});
