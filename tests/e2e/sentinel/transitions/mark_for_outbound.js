const { expect } = require('chai');

const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');

const makeReport = () => ({
  _id: uuid(),
  type: 'data_record',
  form: 'test'
});

const getTasks = () => sentinelUtils.requestOnSentinelTestDb({
  method: 'POST',
  path: '/_find',
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    selector: {
      _id: {
        $gt: 'task:outbound:',
        $lt: 'task:outbound:\ufff0'
      }
    }
  }
}).then(result => result.docs);

const wipeTasks = () => getTasks()
  .then(tasks => {
    tasks.forEach(t => t._deleted = true);
    return sentinelUtils.requestOnSentinelTestDb({
      method: 'POST',
      path: '/_bulk_docs',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {docs: tasks}
    });
  });

describe('mark_for_outbound', () => {
  afterEach(done => Promise.all([utils.revertSettings(), wipeTasks()]).then(done));
  afterAll(done => utils.revertDb().then(done));

  it('ignores reports if there is no outbound configuration at all', () => {
    const report = makeReport();
    const config = {
      transitions: {
        mark_for_outbound: true
      }
    };

    return utils
      .updateSettings(config, true)
      .then(() => utils.saveDoc(report))
      .then(() => sentinelUtils.waitForSentinel([report._id]))
      .then(getTasks)
      .then(tasks => {
        expect(tasks.length).to.equal(0);
      });
  });

  it('ignores reports if there is no matching outbound configuration', () => {
    const report = makeReport();
    const config = {
      transitions: {
        mark_for_outbound: true
      },
      outbound: {
        test: {
          relevant_to: `doc.type === 'something else'`
        }
      }
    };

    return utils
      .updateSettings(config, true)
      .then(() => utils.saveDoc(report))
      .then(() => sentinelUtils.waitForSentinel([report._id]))
      .then(getTasks)
      .then(tasks => {
        expect(tasks.length).to.equal(0);
      });
  });

  it('creates a task for a report based on configuration', () => {
    const report = makeReport();
    const config = {
      transitions: {
        mark_for_outbound: true
      },
      outbound: {
        test: {
          relevant_to: `doc.type === 'data_record' && doc.form === 'test'`
        }
      }
    };

    return utils
      .updateSettings(config, true)
      .then(() => utils.saveDoc(report))
      .then(() => sentinelUtils.waitForSentinel([report._id]))
      .then(getTasks)
      .then(tasks => {
        expect(tasks.length).to.equal(1);
        expect(tasks[0]).to.include({
          _id: `task:outbound:${report._id}`,
          type: 'task:outbound',
          doc_id: report._id
        });
        expect(tasks[0].queue).to.deep.equal(['test']);
      });
  });
  it('does not update an existing task if a report gets edited', () => {
    let report = makeReport();
    const config = {
      transitions: {
        mark_for_outbound: true
      },
      outbound: {
        test: {
          relevant_to: `doc.type === 'data_record' && doc.form === 'test'`
        },
        test2: {
          relevant_to: 'doc.secondTime'
        }
      }
    };

    return utils
      .updateSettings(config, true)
      .then(() => utils.saveDoc(report))
      .then(() => sentinelUtils.waitForSentinel([report._id]))
      .then(getTasks)
      .then(tasks => {
        expect(tasks.length).to.equal(1);
        expect(tasks[0].queue).to.deep.equal(['test']);
      })
      .then(() => utils.getDoc(report._id))
      .then(result => {
        report = result;
        report.secondTime = true;
        return utils.saveDoc(report);
      })
      .then(getTasks)
      .then(tasks => {
        expect(tasks.length).to.equal(1);
        expect(tasks[0].queue).to.deep.equal(['test']);
      });
  });
});
