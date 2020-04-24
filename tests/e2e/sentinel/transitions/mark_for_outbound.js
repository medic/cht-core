const { expect } = require('chai');

const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');

// Mock server code, consider moving this elsewhere?
const express = require('express');
const bodyParser = require('body-parser');
const mockApp = express();
mockApp.use(bodyParser.json());

const WORKING_ENDPOINT = '/working-endpoint';
const BROKEN_ENDPOINT = '/broken-endpoint';
let workingEndpointRequests = [];
let brokenEndpointRequests = [];
let server;

mockApp.post(WORKING_ENDPOINT, (req, res) => {
  workingEndpointRequests.push(req.body);
  res.status(200).end();
});

mockApp.post(BROKEN_ENDPOINT, (req, res) => {
  brokenEndpointRequests.push(req.body);
  res.status(500).end();
});

const startMockApp = () => {
  return new Promise(resolve => {
    server = mockApp.listen(resolve);
  });
};

const stopMockApp = () => {
  server && server.close();
  workingEndpointRequests = [];
  brokenEndpointRequests = [];
};


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

  describe('when external server is up', () => {
    beforeEach(done => startMockApp().then(done));
    afterEach(done => { stopMockApp(); done(); });

    it('correctly creates and sends an outbound request immediately', () => {
      const report = makeReport();
      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.form === "test"',
            destination: {
              base_url: `http://localhost:${server.address().port}`,
              path: WORKING_ENDPOINT
            },
            mapping: {
              id: 'doc._id',
              rev: 'doc._rev'
            }
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
        })
        .then(() => utils.getDoc(report._id))
        .then(report => {
          expect(brokenEndpointRequests.length).to.equal(0);
          expect(workingEndpointRequests.length).to.equal(1);
          expect(workingEndpointRequests[0]).to.deep.equal({
            id: report._id,
            rev: report._rev
          });
        });
    });

    it('correctly creates a task if the immediate server request fails', () => {
      const report = makeReport();
      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.form === "test"',
            destination: {
              base_url: `http://localhost:${server.address().port}`,
              path: BROKEN_ENDPOINT
            },
            mapping: {
              id: 'doc._id',
              rev: 'doc._rev'
            }
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
        })
        .then(() => utils.getDoc(report._id))
        .then(report => {
          expect(workingEndpointRequests.length).to.equal(0);
          expect(brokenEndpointRequests.length).to.equal(1);
          expect(brokenEndpointRequests[0]).to.deep.equal({
            id: report._id,
            rev: report._rev
          });
        });
    });
  });

  describe('when external server is down', () => {
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
});
