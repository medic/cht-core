const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const { CONTACT_TYPES, PREFIXES, BULK_OPERATIONS } = require('@medic/constants');
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
  const getBulkOperationActions = (keys) => utils.sentinelDb
    .allDocs({ keys, include_docs: true })
    .then(({ rows }) => rows.map(({ doc }) => doc).filter(Boolean));

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
      const person = personFactory.build();
      await utils.saveDoc(person);

      const { id } = await utils.request({ path: `/api/v1/person/${person._id}`, method: 'DELETE' });

      const log = await utils.waitForBulkOperation(id);
      expect(log._id).to.equal(id);
      expect(new Date(log.start_date).getTime()).to.be.closeTo(Date.now(), 60000);
      const [[actionId, action], ...additional] = Object.entries(log.actions);
      expect(actionId.slice(PREFIXES.BULK_OPERATION_ACTION.length)
        .startsWith(id.slice(PREFIXES.BULK_OPERATION_LOG.length))).to.be.true;
      expect(additional).to.be.empty;
      expect(action).excluding('updated_date').to.deep.equal({
        action: 'archive',
        status: 'completed',
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

    const {
      id,
      summary: { archive: { contacts } }
    } = await utils.request({ path: `/api/v1/place/${parent._id}`, method: 'DELETE' });

    await utils.waitForBulkOperation(id, 1000);

    expect(contacts).to.equal(3001);
    const deleted = await utils.getDocs([parent._id, ...persons.map(({ _id }) => _id)]);
    expect(deleted.filter(Boolean)).to.be.empty;
  });

  it('queues multiple actions and performs them when Sentinel starts', async () => {
    const persons = Array
      .from({ length: 3})
      .map((_, i) => personFactory.build({ name: `person${i}`}));
    await utils.saveDocs(persons);
    await utils.stopSentinel();

    const bulkOperationLogIds = await Promise.all(persons.map(({ _id }) => utils
      .request({ path: `/api/v1/person/${_id}`, method: 'DELETE' })
      .then(({ id }) => id)));
    const bulkOperationLogs = await getBulkOperationLogs(bulkOperationLogIds);
    const actionIds = bulkOperationLogs.flatMap(({ actions }) => Object.keys(actions));
    const bulkOperationActions = await getBulkOperationActions(actionIds);

    expect(bulkOperationLogs).to.have.lengthOf(3);
    expect(bulkOperationLogs[0]).excludingEvery(['_rev', 'start_date', 'updated_date']).to.deep.equal({
      _id: bulkOperationLogIds[0],
      actions: { [bulkOperationActions[0]._id]: {
        action: 'archive',
        status: 'queued',
        total_changes_count: 1
      } }
    });
    expect(bulkOperationActions).to.have.lengthOf(3);
    bulkOperationActions.forEach((action, i) => expect(action)
      .excluding(['_attachments', '_rev'])
      .to.deep.equal({
        _id: actionIds[i],
        action: 'archive',
        bulk_operation_id: bulkOperationLogs[i]._id,
        cursor: 0,
        total: 1
      }));

    const buffer = await utils.sentinelDb.getAttachment(actionIds[0], BULK_OPERATIONS.OPERATIONS_ATTACHMENT);
    const attachment = JSON.parse(buffer.toString());
    expect(attachment).to.deep.equal([{ id: persons[0]._id }]);

    // Add invalid operations to test failure scenario
    const updatedAttachment = [{ id: 'notfound0' }, ...attachment, { notid: 'notfound1' }];
    await utils.sentinelDb.putAttachment(
      actionIds[0],
      BULK_OPERATIONS.OPERATIONS_ATTACHMENT,
      bulkOperationActions[0]._rev,
      Buffer.from(JSON.stringify(updatedAttachment)).toString('base64'),
      'application/json'
    );

    await utils.startSentinel();
    await Promise.all(bulkOperationLogIds.map(id => utils.waitForBulkOperation(id, 100)));

    expect(await getBulkOperationActions(actionIds)).to.be.empty;
    const [failedLog, ...completedLogs] = await getBulkOperationLogs(bulkOperationLogIds);
    expect(completedLogs).to.have.lengthOf(2);
    completedLogs.forEach((log, i) => expect(log.actions[actionIds[i + 1]].status).to.equal('completed'));
    expect(failedLog.actions[actionIds[0]]).excluding('updated_date').to.deep.equal({
      action: 'archive',
      status: 'failed',
      total_changes_count: 1,
      failed_operations: [
        { notid: 'notfound1' },
        { id: 'notfound0' }
      ]
    });
  });
});
