const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const chai = require('chai');

const pushes = {
  one: {
    destination: {
      base_url: 'http://127.0.0.1:8888',
      path: '/one'
    },
    mapping: {
      id: 'doc._id',
      clinic: 'doc.contact.parent._id',
      'fields.ab': {
        expr: 'doc.fields.a * doc.fields.b + 100',
      },
      'fields.cd': {
        expr: 'doc.fields.c - doc.fields.d',
        optional: true,
      },
      patient: {
        path: 'doc.fields.patient_id',
        optional: true
      }
    }
  },
  two: {
    destination: {
      base_url: 'http://127.0.0.1:8888',
      path: '/two'
    },
    mapping: {
      keys: {
        expr: 'doc.fields && Object.keys(doc.fields).map(key => "key" + key)',
      },
      values: {
        expr: 'doc.fields && Object.values(doc.fields).map(value => "value" + value)'
      }
    }
  },
};

const docs = [
  {
    _id: 'no_clinic',
    pushes: ['one'],
  },
  {
    _id: 'no_patient_no_fields',
    contact: { _id: 'chw_id', parent: { _id: 'clinic_id' } },
    pushes: ['one'],
  },
  {
    _id: 'no_patient_nocd',
    contact: { _id: 'chw_id', parent: { _id: 'clinic_id' } },
    fields: { a: 1, b: 2 },
    pushes: ['one'],
  },
  {
    _id: 'all_fields_1',
    contact: { _id: 'other_chw', parent: { _id: 'other_clinic' } },
    fields: { a: 5, b: 4, c: 10, d: 8, patient_id: 'alpha' },
    pushes: ['one', 'two'],
  },
  {
    _id: 'all_fields_2',
    contact: { _id: 'some_chw', parent: { _id: 'some_clinic' } },
    fields: { a: -5, b: 20, c: 9, d: 12, patient_id: 'beta' },
    pushes: ['one', 'two'],
  },
  {
    _id: 'for_two',
    fields: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
    pushes: ['two', 'missing'],
  }
];

const docsToDelete = [
  { _id: 'to_delete' }
];

const tasks = docs.concat(docsToDelete).map(doc => ({
  _id: `task:outbound:${doc._id}`,
  type: 'task:outbound',
  doc_id: doc._id,
  queue: doc.pushes,
}));

const express = require('express');
const bodyParser = require('body-parser');
const destinationApp = express();
const jsonParser = bodyParser.json({ limit: '32mb' });
const inboxes = { one: [], two: [] };
destinationApp.use(jsonParser);
destinationApp.post('/one', (req, res) => inboxes['one'].push(req.body) && res.send('true'));
destinationApp.post('/two', (req, res) => inboxes['two'].push(req.body) && res.send('true'));
let server;

const waitForPushes = () => {
  return getTasks().then(result => {
    if (result.rows.length === 2) {
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
    server = destinationApp.listen(8888);
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => utils.revertDb().then(() => wipeTasks()));

  it('should send outbound tasks correctly', () => {
    return utils
      .updateSettings({ outbound: pushes })
      .then(() => utils.stopSentinel())
      .then(() => utils.saveDocs(docs.concat(docsToDelete)))
      .then(() => utils.deleteDocs(docsToDelete.map(d => d._id)))
      .then(() => utils.sentinelDb.bulkDocs(tasks))
      .then(() => utils.startSentinel())
      .then(() => sentinelUtils.waitForSentinel())
      .then(() => waitForPushes())
      .then(() => {
        chai.expect(inboxes.one.length).to.equal(3);
        chai.expect(inboxes.two.length).to.equal(3);

        chai.expect(inboxes.one).to.have.deep.members([
          {
            id: 'no_patient_nocd',
            clinic: 'clinic_id',
            fields: {
              ab: 102,
              cd: null,
            },
          },
          {
            id: 'all_fields_1',
            clinic: 'other_clinic',
            fields: {
              ab: 120,
              cd: 2,
            },
            patient: 'alpha',
          },
          {
            id: 'all_fields_2',
            clinic: 'some_clinic',
            fields: {
              ab: 0,
              cd: -3,
            },
            patient: 'beta',
          }
        ]);

        chai.expect(inboxes.two).to.have.deep.members([
          {
            keys: ['keya', 'keyb', 'keyc', 'keyd', 'keypatient_id'],
            values: ['value5', 'value4', 'value10', 'value8', 'valuealpha']
          },
          {
            keys: ['keya', 'keyb', 'keyc', 'keyd', 'keypatient_id'],
            values: ['value-5', 'value20', 'value9', 'value12', 'valuebeta']
          },
          {
            keys: ['keya', 'keyb', 'keyc', 'keyd', 'keye', 'keyf'],
            values: ['value1', 'value2', 'value3', 'value4', 'value5', 'value6']
          }
        ]);
      })
      .then(() => utils.getDocs(docs.map(doc => doc._id)))
      .then(results => {
        // original docs were not updated
        results.forEach(doc => chai.expect(doc._rev.startsWith('1-')).to.equal(true));
      })
      .then(() => utils.sentinelDb.allDocs({ keys: tasks.map(task => task._id), include_docs: true }))
      .then(result => {
        // all sent task:outbound docs have been deleted, all unsent still exist unchanged
        const sentTasks = [
          'task:outbound:no_patient_nocd',
          'task:outbound:all_fields_1',
          'task:outbound:all_fields_2',
          'task:outbound:for_two',
          'task:outbound:to_delete'
        ];
        result.rows.forEach(task => {
          if (sentTasks.includes(task.id)) {
            chai.expect(task.doc).to.equal(null);
          } else {
            chai.expect(task.doc).not.to.equal(null);
            chai.expect(task.doc).to.deep.include(tasks.find(t => t._id === task.id));
          }
        });
      })
      .then(() => sentinelUtils.getInfoDocs(docs.concat(docsToDelete).map(doc => doc._id)))
      .then(infos => {
        const findById = id => infos.find(info => info.doc_id === id);

        // infodoc.completed_tasks filled correctly
        chai.expect(findById('no_clinic').completed_tasks).to.equal(undefined);
        chai.expect(findById('no_patient_no_fields').completed_tasks).to.equal(undefined);
        chai.expect(findById('no_patient_nocd').completed_tasks.length).to.equal(1);
        chai.expect(findById('no_patient_nocd').completed_tasks[0].name).to.equal('one');
        chai.expect(findById('all_fields_1').completed_tasks.length).to.equal(2);
        chai.expect(findById('all_fields_1').completed_tasks[0].name).to.equal('one');
        chai.expect(findById('all_fields_1').completed_tasks[1].name).to.equal('two');
        chai.expect(findById('all_fields_2').completed_tasks.length).to.equal(2);
        chai.expect(findById('all_fields_2').completed_tasks[0].name).to.equal('one');
        chai.expect(findById('all_fields_2').completed_tasks[1].name).to.equal('two');
        chai.expect(findById('for_two').completed_tasks.length).to.equal(1);
        chai.expect(findById('for_two').completed_tasks[0].name).to.equal('two');
      });
  });
});
