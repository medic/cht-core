const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { CONTACT_TYPES, PREFIXES } = require('@medic/constants');
const { v7: uuid } = require('uuid');
const { expect } = require('chai');

describe('Bulk operations API', () => {
  const place = utils.deepFreeze(placeFactory.place().build({
    name: 'place',
    type: CONTACT_TYPES.DISTRICT_HOSPITAL,
    contact: {}
  }));

  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-bulk',
    place: place._id,
    contact: {
      _id: 'fixture:user:offline-bulk',
      name: 'Offline User',
    },
    roles: ['chw']
  }));

  const getBulkOperationLogs = (keys) => utils.logsDb
    .allDocs({ keys, include_docs: true })
    .then(({ rows }) => rows.map(({ doc }) => doc).filter(Boolean));
  // Action docs carry their operation's uuid, so one range read finds everything it owns.
  const getActionDocsFor = async (logIds) => {
    const results = await Promise.all(logIds.map((logId) => {
      const prefix = `${PREFIXES.BULK_OPERATION_ACTION}${logId.slice(PREFIXES.BULK_OPERATION_LOG.length)}:`;
      return utils.sentinelDb.allDocs({ startkey: prefix, endkey: `${prefix}\ufff0` });
    }));
    return results.flatMap(({ rows }) => rows);
  };

  before(async () => {
    await utils.saveDoc(place);
    await utils.createUsers([offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([offlineUser]);
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

    it('reports the operation as completed once it is processed', async () => {
      // An explicit shortcode: the factory defaults every person to `test_woman_1`, and delete
      // matches reports by shortcode as well as by uuid, so the default would pull in any report
      // another spec left behind.
      const person = personFactory.build({ patient_id: 'bulk-op-status' });
      await utils.saveDoc(person);

      const { id } = await utils.request({ path: `/api/v1/person/${person._id}`, method: 'DELETE' });

      const log = await utils.waitForBulkOperation(id);
      expect(log._id).to.equal(id);
      expect(log.status).to.equal('completed');
      expect(log.type).to.equal('delete-contact');
      expect(log.params).to.deep.equal({ contact_id: person._id, delete_users: false });
      expect(log.summary.delete).to.deep.equal({ contacts: 1, reports: 0 });
      expect(new Date(log.start_date).getTime()).to.be.closeTo(Date.now(), 60000);

      const planned = JSON.stringify(log.actions);
      const deleted = Object.entries(log.actions).filter(([ , entry ]) => entry.action === 'delete');
      expect(deleted, planned).to.have.lengthOf(1);
      const [[ actionId, action ]] = deleted;
      expect(actionId.slice(PREFIXES.BULK_OPERATION_ACTION.length)
        .startsWith(id.slice(PREFIXES.BULK_OPERATION_LOG.length))).to.be.true;
      expect(action).excluding('updated_date').to.deep.equal({
        action: 'delete',
        total_changes_count: 1
      });
      expect(new Date(action.updated_date).getTime()).to.be.closeTo(Date.now(), 60000);
    });
  });

  it('processes a large number of operations in the same action', async () => {
    const parent = utils.deepFreeze(placeFactory.place().build({
      name: 'place',
      type: CONTACT_TYPES.DISTRICT_HOSPITAL,
      contact: {}
    }));
    const persons = Array
      .from({ length: 3000})
      .map((_, i) => personFactory.build({ name: `person${i}`, parent }));
    await utils.saveDocs([parent, ...persons]);

    const { id } = await utils.request({ path: `/api/v1/place/${parent._id}`, method: 'DELETE' });

    // The summary is worked out when Sentinel plans the operation, so it lands on the log.
    const log = await utils.waitForBulkOperation(id, 1000);

    expect(log.summary.delete.contacts).to.equal(3001);
    const deleted = await utils.getDocs([parent._id, ...persons.map(({ _id }) => _id)]);
    expect(deleted.filter(Boolean)).to.be.empty;
  });

  it('records only the log until Sentinel plans the operation', async () => {
    const persons = Array
      .from({ length: 3})
      .map((_, i) => personFactory.build({ name: `person${i}`}));
    await utils.saveDocs(persons);
    await utils.stopSentinel();

    const bulkOperationLogIds = await Promise.all(persons.map(({ _id }) => utils
      .request({ path: `/api/v1/person/${_id}`, method: 'DELETE' })
      .then(({ id }) => id)));
    const queuedLogs = await getBulkOperationLogs(bulkOperationLogIds);

    // Nothing but the intent is written while Sentinel is down.
    expect(queuedLogs).to.have.lengthOf(3);
    queuedLogs.forEach((log, i) => {
      expect(log.status).to.equal('queued');
      expect(log.type).to.equal('delete-contact');
      expect(log.params).to.deep.equal({ contact_id: persons[i]._id, delete_users: false });
      expect(log.actions).to.be.undefined;
      expect(log.summary).to.be.undefined;
    });
    expect(await getActionDocsFor(bulkOperationLogIds)).to.be.empty;

    await utils.startSentinel();
    await Promise.all(bulkOperationLogIds.map(id => utils.waitForBulkOperation(id, 100)));

    const finishedLogs = await getBulkOperationLogs(bulkOperationLogIds);
    finishedLogs.forEach((log) => {
      expect(log.status).to.equal('completed');
      expect(log.summary.delete).to.deep.equal({ contacts: 1, reports: 0 });
      expect(Object.values(log.actions).map(action => action.action)).to.deep.equal([ 'delete' ]);
    });
    // the action docs are cleaned up as they are run
    expect(await getActionDocsFor(bulkOperationLogIds)).to.be.empty;
    const deleted = await utils.getDocs(persons.map(({ _id }) => _id));
    expect(deleted.filter(Boolean)).to.be.empty;
  });

  it('fails the operation when it is no longer valid by the time it is planned', async () => {
    const district = placeFactory.place().build({
      name: 'stale-district',
      type: CONTACT_TYPES.DISTRICT_HOSPITAL,
      contact: {},
    });
    const healthCenter = placeFactory.place().build({
      name: 'stale-hc',
      type: CONTACT_TYPES.HEALTH_CENTER,
      contact: {},
      parent: district,
    });
    const clinic = placeFactory.place().build({
      name: 'stale-clinic',
      type: CONTACT_TYPES.CLINIC,
      contact: {},
      parent: healthCenter,
    });
    await utils.saveDocs([district, healthCenter, clinic]);

    // The intent is recorded directly rather than through the API, which would refuse a destination
    // that does not exist. That is the point: the API validated against a hierarchy that has since
    // changed, and it is the plan, running later, that has to catch it.
    const id = `${PREFIXES.BULK_OPERATION_LOG}${uuid()}`;
    const now = new Date();
    await utils.logsDb.put({
      _id: id,
      type: 'move-contact',
      params: { contact_id: clinic._id, parent_id: 'destination-that-went-away' },
      status: 'queued',
      start_date: now,
      updated_date: now,
    });

    const log = await utils.waitForBulkOperation(id, 100);

    expect(log.status).to.equal('failed');
    expect(log.error.message).to.contain(`destination contact 'destination-that-went-away' not found`);
    expect(log.actions).to.be.undefined;
    const unmoved = await utils.getDoc(clinic._id);
    expect(unmoved.parent._id).to.equal(healthCenter._id);
  });
});
