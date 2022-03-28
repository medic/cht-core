const { expect } = require('chai');

const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const uuid = require('uuid').v4;

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
  res.status(500).json({error: 500, some: 'error response'}).end();
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
  afterEach(() => Promise.all([utils.revertSettings(true), wipeTasks()]));
  after(() => utils.revertDb([], true));

  describe('when external server is up', () => {
    beforeEach(() => startMockApp());
    afterEach(() => stopMockApp());

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
              base_url: utils.hostURL(server.address().port),
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
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.be.empty;
        })
        .then(() => utils.getDoc(report._id))
        .then(report => {
          expect(brokenEndpointRequests).to.be.empty;
          expect(workingEndpointRequests).to.have.lengthOf(1);
          expect(workingEndpointRequests[0]).to.deep.equal({
            id: report._id,
            rev: report._rev
          });
        })
        .then(() => sentinelUtils.getInfoDoc(report._id))
        .then(infoDoc => {
          expect(infoDoc).to.nested.include({
            type: 'info',
            doc_id: report._id,
            'completed_tasks[0].type': 'outbound',
            'completed_tasks[0].name': 'test'
          });
        });
    });

    it('correctly skips sending the same outbound multiple times', () => {
      const report = makeReport();
      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.form === "test"',
            destination: {
              base_url: utils.hostURL(server.address().port),
              path: WORKING_ENDPOINT
            },
            mapping: {
              id: 'doc._id',
              form: 'doc.form'
            }
          }
        }
      };

      // First round
      return utils
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.be.empty;
        })
        .then(() => utils.getDoc(report._id))
        .then(report => {
          expect(brokenEndpointRequests).to.be.empty;
          expect(workingEndpointRequests).to.have.lengthOf(1);
          expect(workingEndpointRequests[0]).to.deep.equal({
            id: report._id,
            form: report.form
          });

          // It worked, let's do it again
          report.anotherChange = true;
          return utils.saveDoc(report);
        })
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          // And confirm that there are no new writes to the external service
          expect(tasks).to.be.empty;
          expect(brokenEndpointRequests).to.be.empty;
          expect(workingEndpointRequests).to.have.lengthOf(1);
        })
        .then(() => sentinelUtils.getInfoDoc(report._id))
        .then(infoDoc => {
          expect(infoDoc).to.nested.include({
            type: 'info',
            doc_id: report._id,
            'completed_tasks[0].type': 'outbound',
            'completed_tasks[0].name': 'test'
          });
          expect(infoDoc.completed_tasks).to.have.lengthOf(1);
        });
    });

    it('correctly sends changed doc outbound multiple times', () => {
      let report = makeReport();
      report.hello = 'there';

      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.hello === "there"',
            destination: {
              base_url: utils.hostURL(server.address().port),
              path: WORKING_ENDPOINT
            },
            mapping: {
              id: 'doc._id',
              form: 'doc.form'
            }
          }
        }
      };

      // First round
      return utils
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.be.empty;
        })
        .then(() => utils.getDoc(report._id))
        .then(result => {
          report = result;

          expect(brokenEndpointRequests).to.be.empty;
          expect(workingEndpointRequests).to.have.lengthOf(1);
          expect(workingEndpointRequests[0]).to.deep.equal({
            id: report._id,
            form: report.form
          });

          // It worked, let's do it again
          report.form = 'we changed the form';
          return utils.saveDoc(report);
        })
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          // And confirm that it got sent again
          expect(tasks).to.be.empty;
          expect(brokenEndpointRequests).to.be.empty;
          expect(workingEndpointRequests).to.have.lengthOf(2);
          expect(workingEndpointRequests[1]).to.deep.equal({
            id: report._id,
            form: 'we changed the form'
          });
        })
        .then(() => sentinelUtils.getInfoDoc(report._id))
        .then(infoDoc => {
          expect(infoDoc).to.nested.include({
            type: 'info',
            doc_id: report._id,
            'completed_tasks[0].type': 'outbound',
            'completed_tasks[0].name': 'test',
            'completed_tasks[1].type': 'outbound',
            'completed_tasks[1].name': 'test'
          });
          expect(infoDoc.completed_tasks).to.have.lengthOf(2);
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
              base_url: utils.hostURL(server.address().port),
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
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.have.lengthOf(1);
          expect(tasks[0]).to.include({
            _id: `task:outbound:${report._id}`,
            type: 'task:outbound',
            doc_id: report._id
          });
          expect(tasks[0].queue).to.deep.equal(['test']);
        })
        .then(() => utils.getDoc(report._id))
        .then(report => {
          expect(workingEndpointRequests).to.be.empty;
          expect(brokenEndpointRequests).to.have.lengthOf(1);
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
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.be.empty;
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
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.be.empty;
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
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.have.lengthOf(1);
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
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(getTasks)
        .then(tasks => {
          expect(tasks).to.have.lengthOf(1);
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
          expect(tasks).to.have.lengthOf(1);
          expect(tasks[0].queue).to.deep.equal(['test']);
        });
    });
  });

  describe('error logging', () => {
    // Doing this in an e2e test in case our request library changes in the future

    beforeEach(() => startMockApp());
    afterEach(() => stopMockApp());

    it('logs an error if mapping errors', () => {
      const report = makeReport();
      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.form === "test"',
            destination: {
              base_url: utils.hostURL(server.address().port),
              path: WORKING_ENDPOINT
            },
            mapping: {
              id: 'doc._idddddddddddddddd',
            }
          }
        }
      };

      let collect;

      return utils
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => utils.collectSentinelLogs(/Mapping error.+_idddddddddddddddd/))
        .then((result) => collect = result)
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(() => collect())
        .then(logs => {
          expect(logs).to.have.lengthOf(1);
        });
    });

    it('logs an error if the server returns !2xx', () => {
      const report = makeReport();
      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.form === "test"',
            destination: {
              base_url: utils.hostURL(server.address().port),
              path: BROKEN_ENDPOINT
            },
            mapping: {
              id: 'doc._id',
            }
          }
        }
      };

      let collect;

      return utils
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => utils.collectSentinelLogs(/Failed to push/, /Response body.+error response/))
        .then((result) => collect = result)
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(() => collect())
        .then(logs => {
          expect(logs).to.have.lengthOf(2);
        });
    });

    it('logs an error if the server cannot be found', () => {
      const report = makeReport();
      const config = {
        transitions: {
          mark_for_outbound: true
        },
        outbound: {
          test: {
            relevant_to: 'doc.type === "data_record" && doc.form === "test"',
            destination: {
              base_url: utils.hostURL(server.address().port),
              path: WORKING_ENDPOINT
            },
            mapping: {
              id: 'doc._id',
            }
          }
        }
      };

      stopMockApp();
      let collect;

      return utils
        .updateSettings(config, 'sentinel')
        .then(() => utils.saveDoc(report))
        .then(() => utils.collectSentinelLogs(/Failed to push.+ECONNREFUSED/))
        .then((result) => collect = result)
        .then(() => sentinelUtils.waitForSentinel([report._id]))
        .then(() => collect())
        .then(logs => {
          expect(logs).to.have.lengthOf(1);
        });
    });
  });
});
