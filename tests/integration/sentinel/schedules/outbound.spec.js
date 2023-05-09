const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const chai = require('chai');

const outboundConfig = (port) => ({
  working: {
    destination: {
      base_url: utils.hostURL(port),
      path: '/test-working'
    },
    mapping: {
      id: 'doc._id'
    },
    relevant_to: 'doc._id.startsWith("test")'
  },
  also_working: {
    destination: {
      base_url: utils.hostURL(port),
      path: '/test-working'
    },
    mapping: {
      id: 'doc._id'
    },
    relevant_to: 'doc._id.startsWith("test")'
  },
  broken: {
    destination: {
      base_url: utils.hostURL(port),
      path: '/test-broken'
    },
    mapping: {
      id: 'doc._id'
    },
    relevant_to: 'doc._id.startsWith("test-aaa")'
  }
});

const docs = [
  { _id: 'test-aaa' },
  { _id: 'test-zzz' }
];

const tasks = [{
  _id: `task:outbound:test-aaa`,
  type: 'task:outbound',
  doc_id: 'test-aaa',
  queue: ['working', 'also_working', 'broken'],
}, {
  _id: `task:outbound:test-zzz`,
  type: 'task:outbound',
  doc_id: 'test-zzz',
  queue: ['working', 'also_working'],
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
let port;

const waitForPushes = (expectedTasks = 1) => {
  return getTasks().then(result => {
    if (result.rows.length === expectedTasks) {
      return;
    }
    return utils.delayPromise(() => waitForPushes(expectedTasks), 100);
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
  before(() => {
    // get a random port assigned. we will reuse this port when starting the server again.
    // the known port is necessary for the outbound config
    server = destinationApp.listen();
    port = server.address().port;
    server.close();
  });

  after(() => {
    server.close();
  });

  afterEach(() => utils.revertDb([], true).then(() => wipeTasks()));

  it('should find existing outbound tasks and execute them, leaving them if the send was unsuccessful', () => {
    const settings = {
      outbound: outboundConfig(port),
      transitions: {
        mark_for_outbound: true,
      }
    };
    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(docs))
      // pushes will fail if destination server is not up, so tasks will get created
      .then(() => waitForPushes(2))
      .then(() => utils.stopSentinel())
      .then(() => utils.startSentinel())
      .then(() => server = destinationApp.listen(port)) // and they will generate tasks
      // waiting for 1 task left should imply that the first task, which should stay because it points
      // to a broken endpoint, has executed, since the second task has executed successfully and been
      // deleted
      .then(() => waitForPushes(1))
      .then(() => {
        chai.expect(inboxes.working).to.have.lengthOf(4);
        chai.expect(inboxes.broken).to.have.lengthOf(1);

        chai.expect(inboxes.working).to.have.deep.members([
          { id: 'test-aaa' },
          { id: 'test-aaa' },
          { id: 'test-zzz' },
          { id: 'test-zzz' },
        ]);

        chai.expect(inboxes.broken).to.have.deep.members([
          {id: 'test-aaa'}
        ]);
      })
      .then(() => utils.sentinelDb.allDocs({ keys: docs.map(doc => `task:outbound:${doc._id}`), include_docs: true }))
      .then(tasksResult => {
        chai.expect(tasksResult.rows).to.have.lengthOf(2);
        chai.expect(tasksResult.rows[0].doc).excluding('created').to.deep.equal({
          _id: `task:outbound:test-aaa`,
          _rev: tasksResult.rows[0].doc._rev,
          type: 'task:outbound',
          doc_id: 'test-aaa',
          queue: ['broken'],
        });
        chai.expect(tasksResult.rows[1].value.deleted).to.be.true;
      })
      .then(checkInfoDocs);
  });

  const checkInfoDocs = (retry = 10) =>
    sentinelUtils.getInfoDocs(docs.map(doc => doc._id))
      .then(infoDocs => {
        chai.expect(infoDocs).to.have.lengthOf(2);
        chai.expect(infoDocs[0]).to.nested.include({
          _id: 'test-aaa-info',
          type: 'info',
          doc_id: 'test-aaa',
          'completed_tasks[0].type': 'outbound',
          'completed_tasks[0].name': 'working',
          'completed_tasks[1].type': 'outbound',
          'completed_tasks[1].name': 'also_working',
        });
        chai.expect(infoDocs[1]).to.nested.include({
          _id: 'test-zzz-info',
          type: 'info',
          doc_id: 'test-zzz',
          'completed_tasks[0].type': 'outbound',
          'completed_tasks[0].name': 'working',
          'completed_tasks[1].type': 'outbound',
          'completed_tasks[1].name': 'also_working',
        });
      }).catch(err => {
        // We don't really have a reliable way to know when these writes happen, because of how
        // schedules work. Calling `waitForPushes` is only half the story, so sometimes this can
        // flake
        if (retry) {
          return utils.delayPromise(() => checkInfoDocs(retry - 1), 1000);
        }

        throw err;
      });
});
