const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const reportFactory = require('@factories/cht/reports/generic-report');
const { CONTACT_TYPES, PREFIXES } = require('@medic/constants');
const { expect } = require('chai');

describe('Bulk operations API', () => {
  const contact0 = utils.deepFreeze(personFactory.build({ name: 'contact0', role: 'chw' }));
  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place0 = utils.deepFreeze({ ...placeMap.get(CONTACT_TYPES.CLINIC), contact: { _id: contact0._id } });
  const place1 = utils.deepFreeze(placeMap.get(CONTACT_TYPES.HEALTH_CENTER));
  const place2 = utils.deepFreeze(placeMap.get('district_hospital'));

  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-bulk',
    place: place0._id,
    contact: {
      _id: 'fixture:user:offline-bulk',
      name: 'Offline User',
    },
    roles: ['chw']
  }));

  const allDocItems = [contact0, place0, place1, place2];

  const pollBulkOperation = async (id, tries = 30) => {
    for (let i = 0; i < tries; i++) {
      const log = await utils.request({ path: `/api/v1/bulk-operations/${id}` });
      const actions = Object.values(log.actions || {});
      if (actions.length && actions.every(action => action.status !== 'queued')) {
        return log;
      }
      await utils.delayPromise(1000);
    }
    throw new Error(`bulk operation ${id} did not complete`);
  };

  const cleanupArchiveJobs = async () => {
    const result = await utils.sentinelDb.allDocs({
      startkey: PREFIXES.ARCHIVE_JOB,
      endkey: `${PREFIXES.ARCHIVE_JOB}￰`,
    });
    if (!result.rows.length) {
      return;
    }
    await utils.sentinelDb.bulkDocs(result.rows.map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true })));
  };

  before(async () => {
    await utils.saveDocs(allDocItems);
    await utils.createUsers([offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([offlineUser]);
  });

  afterEach(async () => {
    await cleanupArchiveJobs();
  });

  describe('GET /api/v1/bulk-operations/:id', () => {
    const endpoint = '/api/v1/bulk-operations';

    it('throws 404 when no operation matches the id', async () => {
      await expect(utils.request({ path: `${endpoint}/not-a-real-id` }))
        .to.be.rejectedWith('404 - {"code":404,"error":"Bulk operation not found"}');
    });

    it('throws 403 for an offline user', async () => {
      const opts = {
        path: `${endpoint}/whatever`,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('reports the operation as completed once a delete is processed', async () => {
      const person = personFactory.build({ parent: { _id: place0._id, parent: place0.parent } });
      const report = reportFactory.report().build({ form: 'test-report' }, { patient: person });
      await utils.saveDocs([person, report]);

      const { id } = await utils.request({ path: `/api/v1/person/${person._id}`, method: 'DELETE' });
      expect(id).to.be.a('string');

      const log = await pollBulkOperation(id);
      expect(log._id).to.equal(id);
      const actions = Object.values(log.actions);
      expect(actions).to.have.lengthOf(1);
      expect(actions[0]).to.include({ action: 'archive', status: 'completed' });
    });
  });
});
