const utils = require('../../../utils');
const chai = require('chai');

const outboundConfig = (port) => ({
  working: {
    destination: {
      base_url: `http://127.0.0.1:${port}`,
      path: '/test-working'
    },
    mapping: {
      id: 'doc._id'
    },
    relevant_to: 'false'
  },
  broken: {
    destination: {
      base_url: `http://127.0.0.1:${port}`,
      path: '/test-broken'
    },
    mapping: {
      id: 'doc._id'
    },
    relevant_to: 'false'
  }
});

const docs = [
  {_id: 'test-aaa'},
  {_id: 'test-zzz'}
];

const tasks = [{
  _id: `task:outbound:test-aaa`,
  type: 'task:outbound',
  doc_id: 'test-aaa',
  queue: ['working', 'broken'],
}, {
  _id: `task:outbound:test-zzz`,
  type: 'task:outbound',
  doc_id: 'test-zzz',
  queue: ['working'],
}];

const express = require('express');
const bodyParser = require('body-parser');
const destinationApp = express();
const jsonParser = bodyParser.json({ limit: '32mb' });
const inboxes = { working: [], broken: [] };
destinationApp.use(jsonParser);
destinationApp.post('/test-working', (req, res) => inboxes.working.push(req.body) && res.send('true'));
destinationApp.post('/test-broken', (req, res) => inboxes.broken.push(req.body) && res.status(500).end());
let server;

const waitForPushes = () => {
  return getTasks().then(result => {
    // waiting for 1 task left should imply that the first task, which should stay because it points
    // to a broken endpoint, has executed, since the second task has executed successfully and been
    // deleted
    if (result.rows.length === 1) {
      return;
    }
    return utils.delayPromise(waitForPushes, 100);
  });
};

const getTasks = () => utils.sentinelDb.allDocs({ start_key: 'task:outbound:', end_key: 'task:outbound:\ufff0'});

const wipeTasks = () => {
  return getTasks().then(result => {
    const docsToDelete = result.rows.map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));
    return utils.sentinelDb.bulkDocs(docsToDelete);
  });
};

describe('Outbound', () => {
  beforeAll(() => {
    server = destinationApp.listen();
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => utils.revertDb().then(() => wipeTasks()));

  it('should find existing outbound tasks and execute them, leaving them if the send was unsuccessful', () => {
    return utils
      .updateSettings({ outbound: outboundConfig(server.address().port) })
      .then(() => utils.stopSentinel())
      .then(() => utils.saveDocs(docs))
      .then(() => utils.sentinelDb.bulkDocs(tasks))
      .then(() => utils.startSentinel())
      .then(() => console.log('Waiting for schedules'))
      .then(() => waitForPushes())
      .then(() => {
        chai.expect(inboxes.working.length).to.equal(2);
        chai.expect(inboxes.broken.length).to.equal(1);

        chai.expect(inboxes.working).to.have.deep.members([
          {id: 'test-aaa'},
          {id: 'test-zzz'}
        ]);

        chai.expect(inboxes.broken).to.have.deep.members([
          {id: 'test-aaa'}
        ]);
      })
      .then(() => utils.sentinelDb.allDocs({ keys: tasks.map(task => task._id), include_docs: true }))
      .then(result => {
        chai.expect(result.rows.length).to.equal(2);
        chai.expect(result.rows[0].doc).to.deep.equal({
          _id: `task:outbound:test-aaa`,
          _rev: result.rows[0].doc._rev,
          type: 'task:outbound',
          doc_id: 'test-aaa',
          queue: ['broken'],
        });
        chai.expect(result.rows[1].value.deleted).to.equal(true);
      });
  });
});
