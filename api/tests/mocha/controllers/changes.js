const sinon = require('sinon');
const rewire = require('rewire');

const auth = require('../../../src/auth');
const authorization = require('../../../src/services/authorization');
const tombstoneUtils = require('@medic/tombstone-utils');
const db = require('../../../src/db');
const inherits = require('util').inherits;
const EventEmitter = require('events');
const _ = require('lodash');
const config = require('../../../src/config');
const serverChecks = require('@medic/server-checks');
const environment = require('../../../src/environment');
const purgedDocs = require('../../../src/services/purged-docs');
const replicationLimitLogService = require('../../../src/services/replication-limit-log');
const serverUtils = require('../../../src/server-utils');

let controller;

require('chai').should();

let testReq;
let testRes;
let userCtx;
let ChangesEmitter;
let changesSpy;
let changesCancelSpy;
let clock;
let emitters;
let reqOnClose;
let defaultSettings;
let realSetTimeout;

const nextTick = () => new Promise(resolve => realSetTimeout(() => resolve()));

describe('Changes controller', () => {
  afterEach(() => {
    sinon.restore();
    clock.restore();
    emitters.forEach(emitter => emitter.cancel());
  });

  beforeEach(() => {
    realSetTimeout = setTimeout;
    clock = sinon.useFakeTimers();
    emitters = [];
    userCtx = { name: 'user', facility_id: 'facility', contact_id: 'contact', roles: ['a', 'b'] };
    testReq = { on: sinon.stub().callsFake((event, fn) => reqOnClose = fn), userCtx: userCtx};
    testRes = {
      type: sinon.stub(),
      write: sinon.stub(),
      end: sinon.stub(),
      setHeader: sinon.stub(),
      flush: sinon.stub(),
      status: sinon.stub()
    };

    defaultSettings = {
      changes_limit: 100,
    };

    changesSpy = sinon.spy();
    changesCancelSpy = sinon.spy();

    sinon.stub(auth, 'getUserSettings').resolves(userCtx);

    sinon.stub(authorization, 'getViewResults').returns({});
    sinon.stub(authorization, 'allowedDoc');
    sinon.stub(authorization, 'getAuthorizationContext').resolves({ userCtx });
    sinon.stub(authorization, 'getAllowedDocIds').resolves({});
    sinon.stub(authorization, 'isAuthChange').returns(false);
    sinon.stub(authorization, 'filterAllowedDocs').returns([]);
    sinon.stub(authorization, 'updateContext').returns(false);

    sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
    sinon.stub(tombstoneUtils, 'generateChangeFromTombstone');
    sinon.stub(tombstoneUtils, 'extractDoc');

    sinon.stub(_, 'now').callsFake(Date.now); // force underscore's debounce to use fake timers!
    sinon.stub(config, 'get').returns(defaultSettings);
    sinon.stub(serverChecks, 'getCouchDbVersion').resolves('2.2.0');

    sinon.stub(purgedDocs, 'getUnPurgedIds').callsFake((roles, ids) => Promise.resolve(ids));
    sinon.stub(replicationLimitLogService, 'put');

    ChangesEmitter = function(opts) {
      changesSpy(opts);
      EventEmitter.call(this);
      const self = this;

      let complete;
      const completeEmitter = (err, resp) => {
        if (err) {
          self.emit('error', err);
        } else {
          self.emit('complete', resp);
        }
        self.removeAllListeners();
      };

      const promise = new Promise((fulfill, reject) => {
        self.on('error', (err) => {
          reject(err);
        });

        complete = (err, resp) => {
          if (err) {
            reject(err);
          } else {
            completeEmitter(null, resp);
            fulfill(resp);
          }
        };
      });

      this.cancel = () => {
        changesCancelSpy();
        self.emit('cancel');
        complete(null, { status: 'cancelled' });
      };
      this.complete = complete;

      this.then = promise.then.bind(promise);
      this.catch = promise.catch.bind(promise);
      this
        .then(result => complete(null, result), complete)
        .catch(err => complete(err));
    };
    inherits(ChangesEmitter, EventEmitter);

    sinon.stub(db.medic, 'changes').callsFake(opts => {
      const emitter = new ChangesEmitter(opts);
      emitters.push(emitter);
      return emitter;
    });

    sinon.stub(db.medic, 'info').resolves({ update_seq: '' });

    controller = rewire('../../../src/controllers/changes');
  });

  describe('init', () => {
    it('initializes the continuous changes feed and used constants', () => {
      controller.__get__('init')();
      changesSpy.callCount.should.equal(1);
      changesSpy.args[0][0].should.deep.equal({
        live: true,
        include_docs: true,
        since: 'now',
        timeout: false,
        return_docs: false,
      });
      controller.__get__('inited').should.equal(true);
      controller.__get__('continuousFeed').should.equal(emitters[0]);
    });

    it('sends changes to be analyzed and updates current seq when changes come in', () => {
      tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      controller.__get__('init')();
      const emitter = controller.__get__('continuousFeed');
      emitter.emit('change', { id: 'change' }, 0, 'newseq');
      tombstoneUtils.isTombstoneId.callCount.should.equal(1);
      tombstoneUtils.isTombstoneId.args[0][0].should.equal('change');
      controller.__get__('currentSeq').should.equal('newseq');
    });

    it('resets changes listener on error, using last received sequence', () => {
      tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      controller.__get__('init')();
      const emitter = controller.__get__('continuousFeed');
      emitter.emit('change', { id: 'change' }, 0, 'seq-1');
      emitter.emit('change', { id: 'change' }, 0, 'seq-2');
      emitter.emit('change', { id: 'change' }, 0, 'seq-3');
      emitter.emit('error');
      return Promise.resolve().then(() => {
        changesSpy.callCount.should.equal(2);
        changesSpy.args[1][0].since.should.equal('seq-3');
      });
    });

    it('should check if changes requests can be limited', () => {
      sinon.stub(environment, 'serverUrl').value('someURL');
      serverChecks.getCouchDbVersion.resolves('2.2.0');
      return controller.__get__('init')().then(() => {
        serverChecks.getCouchDbVersion.callCount.should.equal(1);
        serverChecks.getCouchDbVersion.args[0].should.deep.equal(['someURL']);
        controller.__get__('limitChangesRequests').should.equal(false);
      });
    });

    it('should check if changes requests can be limited', () => {
      sinon.stub(environment, 'serverUrl').value('someOtherURL');
      serverChecks.getCouchDbVersion.resolves('2.3.0');
      return controller.__get__('init')().then(() => {
        serverChecks.getCouchDbVersion.callCount.should.equal(1);
        serverChecks.getCouchDbVersion.args[0].should.deep.equal(['someOtherURL']);
        controller.__get__('limitChangesRequests').should.equal(true);
      });
    });

    it('should initialize currentSeq', () => {
      db.medic.info.resolves({ update_seq: 'my_seq' });
      return controller.__get__('init')().then(() => {
        controller.__get__('currentSeq').should.equal('my_seq');
      });
    });
  });

  describe('request', () => {
    it('initializes the continuous changes feed', () => {
      controller.request(testReq, testRes);
      changesSpy.callCount.should.equal(1);
    });

    it('handles initialization errors', () => {
      const error = sinon.stub(serverUtils, 'error');
      db.medic.info.rejects({ error: 'timeout' });
      return controller.request(testReq, testRes).then(() => {
        error.callCount.should.equal(1);
      });
    });

    it('handles feed initialization errors', () => {
      const error = sinon.stub(serverUtils, 'error');
      authorization.getAuthorizationContext.rejects({ error: 'timeout' });
      return controller.request(testReq, testRes).then(() => {
        error.callCount.should.equal(1);
      });
    });

    it('only initializes on first call', () => {
      controller.request(testReq, testRes);
      controller.request(testReq, testRes);
      controller.request(testReq, testRes);
      controller.request(testReq, testRes);
      changesSpy.callCount.should.equal(1);
    });

    it('pushes requests to the normal feeds list', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      controller.__get__('init')();
      controller.request(testReq, testRes);
      return nextTick().then(() => {
        testReq.on.callCount.should.equal(1);
        testReq.on.args[0][0].should.equal('close');
        testRes.type.callCount.should.equal(1);
        testRes.type.args[0][0].should.equal('json');
        const feeds = controller.__get__('changesFeeds');
        feeds.length.should.equal(1);
        testRes.setHeader.callCount.should.equal(0);
      });
    });
  });

  describe('initFeed', () => {
    it('initializes feed with default values', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      return controller
        .__get__('init')()
        .then(() => {
          const emitter = controller.__get__('continuousFeed');
          emitter.emit('change', { id: 'change' }, 0, 'seq-1');
          controller.request(testReq, testRes);
        })
        .then(nextTick)
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.req.should.equal(testReq);
          feed.res.should.equal(testRes);
          feed.req.userCtx.should.equal(userCtx);
          feed.lastSeq.should.equal('seq-1');
          feed.initSeq.should.equal(0);
          feed.currentSeq.should.equal('seq-1');
          feed.pendingChanges.length.should.equal(0);
          feed.results.length.should.equal(0);
          feed.limit.should.equal(100);
          feed.should.not.have.property('heartbeat');
          feed.should.not.have.property('timeout');
          clock.tick(60000);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller.__get__('changesFeeds').length.should.equal(1);
        });
    });

    it('should initialize the feed with correct current_seq', () => {
      db.medic.info.resolves({ update_seq: '12-seq' });
      controller.request(testReq, testRes);
      return nextTick().then(() => {
        const feed = controller.__get__('changesFeeds')[0];
        feed.currentSeq.should.equal('12-seq');
      });
    });

    it('initializes the feed with custom values', () => {
      testReq.query = { limit: 23, heartbeat: 10000, since: 'some-since-655', timeout: 100000 };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      controller.request(testReq, testRes);
      return nextTick().then(() => {
        const feed = controller.__get__('changesFeeds')[0];
        feed.limit.should.equal(23);
        feed.heartbeat.should.be.an('Object');
        feed.timeout.should.be.an('Object');
        clock.tick(82000);
        testRes.write.callCount.should.equal(8);
        testRes.write.args.should.deep.equal([
          ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'] //heartbeats
        ]);
        testRes.end.callCount.should.equal(0);
        controller.__get__('changesFeeds').length.should.equal(1);
        clock.tick(30000);
        testRes.end.callCount.should.equal(1);
        controller.__get__('changesFeeds').length.should.equal(0);
        feed.should.not.have.property('debouncedEnd');
      });
    });

    it('requests user authorization information with correct userCtx', () => {
      const subjectIds = ['s1', 's2', 's3'];
      const allowedDocIds = ['d1', 'd2', 'd3'];
      const contactsByDepthKeys = [['facility_id']];
      authorization.getAuthorizationContext.resolves({ subjectIds, contactsByDepthKeys, userCtx });
      authorization.getAllowedDocIds.resolves(allowedDocIds);
      controller.request(testReq, testRes);
      return nextTick().then(() => {
        authorization.getAuthorizationContext.callCount.should.equal(1);
        authorization.getAuthorizationContext.withArgs(userCtx).callCount.should.equal(1);
        authorization.getAllowedDocIds.callCount.should.equal(1);
        authorization.getAllowedDocIds
          .withArgs(sinon.match({ req: { userCtx }, subjectIds, contactsByDepthKeys }))
          .callCount.should.equal(1);
        const feed = controller.__get__('changesFeeds')[0];
        feed.allowedDocIds.should.deep.equal(allowedDocIds);
      });
    });

    it('should filter allowedDocIds to not include purges when performing an initial replication', () => {
      const subjectIds = ['s1', 's2', 's3'];
      const allowedDocIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
      const purgedIds = ['d2', 'd6', 'd3'];
      const contactsByDepthKeys = [['facility_id']];
      userCtx.roles = ['a', 'b'];

      authorization.getAuthorizationContext.resolves({ subjectIds, contactsByDepthKeys, userCtx });
      authorization.getAllowedDocIds.resolves(allowedDocIds);
      testReq.query = { initial_replication: true };
      purgedDocs.getUnPurgedIds.resolves(_.difference(allowedDocIds, purgedIds));

      controller.request(testReq, testRes);
      return nextTick().then(() => {
        authorization.getAuthorizationContext.callCount.should.equal(1);
        authorization.getAuthorizationContext.withArgs(userCtx).callCount.should.equal(1);
        authorization.getAllowedDocIds.callCount.should.equal(1);
        authorization.getAllowedDocIds
          .withArgs(sinon.match({ req: { userCtx }, subjectIds, contactsByDepthKeys }))
          .callCount.should.equal(1);
        const feed = controller.__get__('changesFeeds')[0];
        purgedDocs.getUnPurgedIds.callCount.should.equal(1);
        purgedDocs.getUnPurgedIds.args[0].should.deep.equal([['a', 'b'], allowedDocIds]);
        feed.allowedDocIds.should.deep.equal(_.difference(allowedDocIds, purgedIds));
      });
    });

    it('should filter allowedDocIds to not include purges when performing any replication', () => {
      const subjectIds = ['s1', 's2', 's3'];
      const allowedDocIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
      const purgedIds = ['d2', 'd6', 'd3'];
      const contactsByDepthKeys = [['facility_id']];
      userCtx.roles = ['a', 'b'];

      authorization.getAuthorizationContext.resolves({ subjectIds, contactsByDepthKeys, userCtx });
      authorization.getAllowedDocIds.resolves(allowedDocIds);
      purgedDocs.getUnPurgedIds.resolves(_.difference(allowedDocIds, purgedIds));

      controller.request(testReq, testRes);
      return nextTick().then(() => {
        authorization.getAuthorizationContext.callCount.should.equal(1);
        authorization.getAuthorizationContext.withArgs(userCtx).callCount.should.equal(1);
        authorization.getAllowedDocIds.callCount.should.equal(1);
        authorization.getAllowedDocIds
          .withArgs(sinon.match({ req: { userCtx }, subjectIds, contactsByDepthKeys }))
          .callCount.should.equal(1);
        const feed = controller.__get__('changesFeeds')[0];
        purgedDocs.getUnPurgedIds.callCount.should.equal(1);
        purgedDocs.getUnPurgedIds.args[0].should.deep.equal([['a', 'b'], allowedDocIds]);
        feed.allowedDocIds.should.deep.equal(_.difference(allowedDocIds, purgedIds));
      });
    });
  });

  describe('getChanges', () => {
    it('requests changes with correct default parameters', () => {
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      controller.request(testReq, testRes);

      return nextTick()
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: 0,
            batch_size: 4,
            doc_ids: ['d1', 'd2', 'd3'],
            return_docs: true,
          });
        });
    });

    it('requests changes with correct query parameters', () => {
      testReq.query = {
        limit: 20, view: 'test', something: 'else', conflicts: true,
        seq_interval: false, since: '22', return_docs: false
      };
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      controller.request(testReq, testRes);
      return nextTick().then(() => {
        changesSpy.callCount.should.equal(2);
        changesSpy.args[1][0].should.deep.equal({
          since: '22',
          batch_size: 4,
          doc_ids: ['d1', 'd2', 'd3'],
          conflicts: true,
          return_docs: true,
        });
      });
    });

    it('should limit changes requests when couchDB version allows it', () => {
      testReq.query = {
        limit: 20, view: 'test', something: 'else', conflicts: true,
        seq_interval: false, since: '22', return_docs: false
      };
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      serverChecks.getCouchDbVersion.resolves('2.3.0');
      controller.request(testReq, testRes);
      return nextTick().then(() => {
        changesSpy.callCount.should.equal(2);
        changesSpy.args[1][0].should.deep.equal({
          limit: 20,
          since: '22',
          batch_size: 4,
          doc_ids: ['d1', 'd2', 'd3'],
          conflicts: true,
          return_docs: true,
        });
      });
    });

    it('sends an error response when the upstream request errors', () => {
      const allowedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(allowedIds.slice());
      let feed;
      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          changesSpy.callCount.should.equal(2);
          feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete('someerror', { status: 'error' });
        })
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(2);
          feed.ended.should.equal(true);
          testRes.status.callCount.should.equal(1);
          testRes.status.args[0].should.deep.equal([ 500 ]);
          feed.error.should.deep.equal('someerror');
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0].should.deep.equal([JSON.stringify({ error: 'Error processing your changes'})]);
          controller.__get__('changesFeeds').length.should.equal(0);
          testRes.end.callCount.should.equal(1);
        });
    });

    it('sends empty response when the upstream request is cancelled', () => {
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 1 };

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.cancel();
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: [], last_seq: 1 }));
          testRes.end.callCount.should.equal(1);
        });
    });

    it('sends complete response when change feed is finished', () => {
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 0 };

      const expected = { results: [{ id: 1, seq: 1 }, { id: 2, seq: 2 }, { id: 3, seq: 22 }], last_seq: 22 };

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete(null, expected);
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify(expected));
          testRes.end.callCount.should.equal(1);
          controller.__get__('changesFeeds').length.should.equal(0);
        });
    });


    it('pushes allowed pending changes to the results, including their seq when not batching', () => {
      const validatedIds = Array.from({length: 101}, () => Math.floor(Math.random() * 101));
      authorization.getAllowedDocIds.resolves(validatedIds);
      authorization.filterAllowedDocs.returns([
        { change: { id: 8, changes: [], seq: 8 }, id: 8, viewResults: {} },
        { change: { id: 9, changes: [], seq: 9 }, id: 9, viewResults: {} }
      ]);
      testReq.query = { since: 0 };

      controller.request(testReq, testRes);

      const expected = {
        results: [{ id: 1, changes: [], seq: 1 }, { id: 2, changes: [], seq: 2 }, { id: 3, changes: [], seq: 3 }],
        last_seq: 3
      };

      return nextTick()
        .then(() => {
          controller.__get__('continuousFeed').emit('change', { id: 7, changes: [], doc: { _id: 7 }, seq: 4 }, 0, 4);
        })
        .then(() => {
          controller.__get__('continuousFeed').emit('change', { id: 8, changes: [], doc: { _id: 8 }, seq: 5 }, 0, 5);
        })
        .then(() => {
          controller.__get__('continuousFeed').emit('change', { id: 9, changes: [], doc: { _id: 9 }, seq: 6 }, 0, 6);
        })
        .then(nextTick)
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.pendingChanges.length.should.equal(3);
          feed.pendingChanges.should.deep.equal([
            { change: { id: 7, changes: [], seq: 4 }, id: 7, viewResults: {} },
            { change: { id: 8, changes: [], seq: 5 }, id: 8, viewResults: {} },
            { change: { id: 9, changes: [], seq: 6 }, id: 9, viewResults: {} }
          ]);
          feed.upstreamRequest.complete(null, expected);
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 1, changes: [], seq: 1 },
              { id: 2, changes: [], seq: 2 },
              { id: 3, changes: [], seq: 3 },
              { id: 8, changes: [], seq: 8 },
              { id: 9, changes: [], seq: 9 }
            ],
            last_seq: 3
          }));
          testRes.end.callCount.should.equal(1);
          controller.__get__('changesFeeds').length.should.equal(0);
          authorization.allowedDoc.callCount.should.equal(0);
          authorization.filterAllowedDocs.callCount.should.equal(1);
          authorization.filterAllowedDocs.args[0][1].should.deep.equal([
            { change: { id: 7, changes: [], seq: 4 }, id: 7, viewResults: {} },
            { change: { id: 8, changes: [], seq: 5 }, id: 8, viewResults: {} },
            { change: { id: 9, changes: [], seq: 6 }, id: 9, viewResults: {} }
          ]);
        });
    });

    it('pushes allowed pending changes to the results, updating their seq when batching', () => {
      const validatedIds = Array.from({length: 101}, () => Math.floor(Math.random() * 101));
      serverChecks.getCouchDbVersion.resolves('2.3.0');
      authorization.getAllowedDocIds.resolves(validatedIds);
      authorization.filterAllowedDocs.returns([
        { change: { id: 8, changes: [], seq: 8 }, id: 8, viewResults: {} },
        { change: { id: 9, changes: [], seq: 9 }, id: 9, viewResults: {} }
      ]);
      testReq.query = { since: 0 };

      controller.request(testReq, testRes);

      const expected = {
        results: [{ id: 1, changes: [], seq: 1 }, { id: 2, changes: [], seq: 2 }, { id: 3, changes: [], seq: 3 }],
        last_seq: 3
      };

      return nextTick()
        .then(() => {
          controller.__get__('continuousFeed').emit('change', { id: 7, changes: [], doc: { _id: 7 }, seq: 4 }, 0, 4);
        })
        .then(() => {
          controller.__get__('continuousFeed').emit('change', { id: 8, changes: [], doc: { _id: 8 }, seq: 5 }, 0, 5);
        })
        .then(() => {
          controller.__get__('continuousFeed').emit('change', { id: 9, changes: [], doc: { _id: 9 }, seq: 6 }, 0, 6);
        })
        .then(nextTick)
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.pendingChanges.length.should.equal(3);
          feed.pendingChanges.should.deep.equal([
            { change: { id: 7, changes: [], seq: 4 }, id: 7, viewResults: {} },
            { change: { id: 8, changes: [], seq: 5 }, id: 8, viewResults: {} },
            { change: { id: 9, changes: [], seq: 6 }, id: 9, viewResults: {} }
          ]);
          feed.upstreamRequest.complete(null, expected);
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 1, changes: [], seq: 1 },
              { id: 2, changes: [], seq: 2 },
              { id: 3, changes: [], seq: 3 },
              { id: 8, changes: [], seq: 3 },
              { id: 9, changes: [], seq: 3 }
            ],
            last_seq: 3
          }));
          testRes.end.callCount.should.equal(1);
          controller.__get__('changesFeeds').length.should.equal(0);
          authorization.allowedDoc.callCount.should.equal(0);
          authorization.filterAllowedDocs.callCount.should.equal(1);
          authorization.filterAllowedDocs.args[0][1].should.deep.equal([
            { change: { id: 7, changes: [], seq: 4 }, id: 7, viewResults: {} },
            { change: { id: 8, changes: [], seq: 5 }, id: 8, viewResults: {} },
            { change: { id: 9, changes: [], seq: 6 }, id: 9, viewResults: {} }
          ]);
        });
    });

    it('when no normal results are received, and the results were not canceled, retry', () => {
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          controller.__get__('changesFeeds')[0].upstreamRequest.complete(null, false);
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller.__get__('changesFeeds');
          feeds.length.should.equal(1);
        });
    });

    it('cancels upstreamRequest when request is closed', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          reqOnClose();
          changesCancelSpy.callCount.should.equal(1);
          testRes.end.callCount.should.equal(0);
          testRes.write.callCount.should.equal(0);
          controller.__get__('changesFeeds').length.should.equal(0);
        });
    });

    it('resets the feed completely if a breaking authorization change is received', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      authorization.getAllowedDocIds.onCall(1).resolves([42]);
      auth.getUserSettings.resolves({ name: 'user', facility_id: 'facility_id' });

      testReq.id = 'myFeed';
      const userChange = {
        id: 'org.couchdb.user:' + userCtx.name,
        doc: {
          _id: 'org.couchdb.user:' + userCtx.name,
          contact_id: 'otherperson'
        },
        changes: [{ rev: 1 }]
      };
      authorization.allowedDoc.withArgs(userChange.id).returns(true);
      authorization.isAuthChange.withArgs(userChange.id).returns(true);

      let initialFeed;

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          const emitter = controller.__get__('continuousFeed');
          emitter.emit('change', userChange, 0, 20);
          initialFeed = controller.__get__('changesFeeds')[0];
          initialFeed.upstreamRequest.complete(null, { results: [], last_seq: 1 });
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller.__get__('changesFeeds');
          feeds.length.should.equal(1);
          feeds[0].should.not.deep.equal(initialFeed);
          feeds[0].id.should.equal('myFeed');
          auth.getUserSettings.callCount.should.equal(1);
          authorization.getAuthorizationContext.callCount.should.equal(2);
          authorization.getAuthorizationContext.args[0][0].should.deep.equal(userCtx);
          authorization.getAuthorizationContext.args[1][0]
            .should.deep.equal({ name: 'user', facility_id: 'facility_id' });
          authorization.getAllowedDocIds.callCount.should.equal(2);
          feeds[0].req.userCtx.should.deep.equal({ name: 'user', facility_id: 'facility_id' });
          initialFeed.ended.should.equal(true);
        });
    });

    it('handles multiple pending changes correctly', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.filterAllowedDocs.returns([
        { change: { id: 1, changes: [], seq: 4 }, id: 1 },
        { change: { id: 3, changes: [], seq: 1 }, id: 3 },
        { change: { id: 2, changes: [], seq: 2 }, id: 2 }
      ]);

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          const emitter = controller.__get__('continuousFeed');
          const feed = controller.__get__('changesFeeds')[0];
          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3 }, seq: 1}, 0, 1);
          feed.pendingChanges.length.should.equal(1);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2 }, seq: 2}, 0, 2);
          feed.pendingChanges.length.should.equal(2);
          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4 }, seq: 3}, 0, 3);
          feed.pendingChanges.length.should.equal(3);
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1 }, seq: 4}, 0, 4);
          feed.pendingChanges.length.should.equal(4);
          feed.upstreamRequest.complete(null, { results: [{ id: 22, seq: 5 }], last_seq: 5 });
        })
        .then(nextTick)
        .then(() => {
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 22, seq: 5 },
              { id: 1, changes: [], seq: 4 },
              { id: 3, changes: [], seq: 1 },
              { id: 2, changes: [], seq: 2 }
            ],
            last_seq: 5
          }));
          authorization.allowedDoc.callCount.should.equal(0);
          authorization.filterAllowedDocs.callCount.should.equal(1);
          authorization.filterAllowedDocs.args[0][1].should.deep.equal([
            { change: { id: 3, changes: [], seq: 1 }, id: 3, viewResults: {} },
            { change: { id: 2, changes: [], seq: 2 }, id: 2, viewResults: {} },
            { change: { id: 4, changes: [], seq: 3 }, id: 4, viewResults: {} },
            { change: { id: 1, changes: [], seq: 4 }, id: 1, viewResults: {} }
          ]);
        });
    });

    it('handles when new pending change is received immediately after completing upstream complete', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.filterAllowedDocs.returns([
        { change: { id: 1, changes: [], seq: 4 }, id: 1 },
        { change: { id: 3, changes: [], seq: 1 }, id: 3 },
        { change: { id: 2, changes: [], seq: 2 }, id: 2 }
      ]);

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete(null, { results: [{ id: 22, seq: 5 }], last_seq: 5 });
        })
        .then(() => {
          const emitter = controller.__get__('continuousFeed');
          const feed = controller.__get__('changesFeeds')[0];
          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3 }, seq: 1}, 0, 1);
          feed.pendingChanges.length.should.equal(1);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2 }, seq: 2}, 0, 2);
          feed.pendingChanges.length.should.equal(2);

          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4 }, seq: 3}, 0, 3);
          feed.pendingChanges.length.should.equal(3);
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1 }, seq: 4}, 0, 4);
          feed.pendingChanges.length.should.equal(4);
        })
        .then(nextTick)
        .then(() => {
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 22, seq: 5 },
              { id: 1, changes: [], seq: 4 },
              { id: 3, changes: [], seq: 1 },
              { id: 2, changes: [], seq: 2 }
            ],
            last_seq: 5
          }));
          authorization.allowedDoc.callCount.should.equal(0);
          authorization.filterAllowedDocs.callCount.should.equal(1);
        });
    });

    it('should copy last change\'s seq as last_seq', () => {
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 0 };

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete(
            null,
            { results: [{ id: 1, seq: 1 }, { id: 2, seq: 2 }, { id: 3, seq: 3 }], last_seq: 22 }
          );
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [{ id: 1, seq: 1 }, { id: 2, seq: 2 }, { id: 3, seq: 3 }],
            last_seq: 3
          }));
          testRes.end.callCount.should.equal(1);
          controller.__get__('changesFeeds').length.should.equal(0);
        });
    });

    it('should copy currentSeq when results are empty', () => {
      testReq.query = { since: 10 };
      db.medic.info.resolves({ update_seq: 21 });
      authorization.getAllowedDocIds.resolves([1, 2]);
      controller.request(testReq, testRes);
      const emitter = controller.__get__('continuousFeed');
      emitter.emit('change', { id: 22, changes: [], doc: { _id: 22 }}, 0, 22);
      return nextTick()
        .then(() => {
          emitter.emit('change', { id: 23, changes: [], doc: { _id: 23 }}, 0, 23);
          emitter.emit('change', { id: 24, changes: [], doc: { _id: 24 }}, 0, 24);
          emitter.emit('change', { id: 25, changes: [], doc: { _id: 25 }}, 0, 25);
          emitter.emit('change', { id: 26, changes: [], doc: { _id: 26 }}, 0, 26);
        })
        .then(nextTick)
        .then(() => {
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete(null, { results: [], last_seq: 26 });
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [],
            last_seq: 21
          }));
          testRes.end.callCount.should.equal(1);
          controller.__get__('changesFeeds').length.should.equal(0);
        });
    });
  });

  describe('handling heartbeats', () => {
    it('does not send heartbeat if not defined', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b' ]);

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          clock.tick(20000);
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0].should.deep.equal( [ JSON.stringify({ results: [], last_seq: '' }) ]);
          controller.__get__('changesFeeds').length.should.equal(0);
        });
    });

    it('does send heartbeat during the whole execution', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b']);
      testReq.query = { heartbeat: 5000 };

      controller.request(testReq, testRes);
      return nextTick()
        .then(() => {
          clock.tick(20000);
          const feed = controller.__get__('changesFeeds')[0];
          feed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(5);
          for (let i = 0; i < 4; i++) {
            testRes.write.args[i][0].should.equal('\n');
          }
          controller.__get__('changesFeeds').length.should.equal(0);
        });
    });
  });

  describe('appendChange', () => {
    it('appends unknown ID change to the list', () => {
      const results = [{ id: 1 }, { id: 2 }];
      const changeObj = { change: { id: 3 } };

      controller.__get__('appendChange')(results, changeObj);
      results.length.should.equal(3);
      results.should.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('appends unknown revs to the revs list', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }] },
        { id: 3, changes: [{ rev: 1 }] }
      ];
      const changeObj = { change: { id: 2, changes: [{ rev: 1 }, { rev: 2}] }, id: 2 };
      controller.__get__('appendChange')(results, changeObj);
      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }, { rev: 2 }] },
        { id: 3, changes: [{ rev: 1 }] }
      ]);
    });

    it('saves deleted status currectly', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }], deleted: true },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }] },
        { id: 3, changes: [{ rev: 1 }] }
      ];

      let changeObj = { change: { id: 1, changes: [{ rev: 2}], deleted: true }, id: 1 };
      controller.__get__('appendChange')(results, changeObj);
      changeObj = { change: { id: 2, changes: [{ rev: 4 }], deleted: true }, id: 2};
      controller.__get__('appendChange')(results, changeObj);
      changeObj = { change: { id: 3, changes: [{ rev: 2 }] }, id: 3};
      controller.__get__('appendChange')(results, changeObj);

      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }], deleted: true },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }, { rev: 4 }], deleted: true },
        { id: 3, changes: [{ rev: 1 }, { rev: 2 }] }
      ]);
    });

    it('deep clones the change object', () => {
      const results = [];
      const changeObj = { change: { id: 1, changes: [{ rev: 1 }]}, viewResults: {}, id: 1 };

      controller.__get__('appendChange')(results, changeObj);
      results[0].should.deep.equal(changeObj.change);
      results[0].should.not.equal(changeObj.change);
    });
  });

  describe('processPendingChanges', () => {
    it('appends filtered authorized changes to the feed results list', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }] }
      ];
      const pendingChanges = [
        { change: { id: 1, changes: [{ rev: 1 }]}, id: 1 },
        { change: { id: 2, changes: [{ rev: 2 }]}, id: 2 },
        { change: { id: 3, changes: [{ rev: 2 }]}, id: 3 },
        { change: { id: 4, changes: [{ rev: 1 }]}, id: 4 },
        { change: { id: 5, changes: [{ rev: 1 }]}, id: 5 },
      ];

      authorization.filterAllowedDocs.returns([
        { change: { id: 1, changes: [{ rev: 1 }]}, id: 1 },
        { change: { id: 2, changes: [{ rev: 2 }]}, id: 2 },
        { change: { id: 5, changes: [{ rev: 1 }]}, id: 5 }
      ]);

      controller.__get__('processPendingChanges')({ pendingChanges, userCtx, results });
      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 5, changes: [{ rev: 1 }] }
      ]);
    });
  });

  describe('hasAuthorizationChange', () => {
    it('returns true when user doc change is received', () => {
      authorization.isAuthChange.withArgs('org.couchdb.user:user').returns(true);

      const pendingChanges = [
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}, id: 1 },
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 }}, id: 2 },
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 }}, id: 3 },
        {
          change: { id: 'org.couchdb.user:user', changes: [{ rev: 1 }], doc: { _id: 'org.couchdb.user:user' }},
          id: 'org.couchdb.user:user'
        },
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 }}, id: 5},
      ];

      controller.__get__('hasAuthorizationChange')({ req: testReq, pendingChanges }).should.equal(true);
    });

    it('returns false when user doc change is not received', () => {
      authorization.isAuthChange.returns(false);

      const pendingChanges = [
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}, id: 1 },
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 }}, id: 2 },
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 }}, id: 3 },
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 }}, id: 5 },
      ];

      controller.__get__('hasAuthorizationChange')({ req: testReq, pendingChanges }).should.equal(false);
    });
  });

  describe('generateTombstones', () => {

    it('converts tombstone changes to their original document counterparts', () => {
      const results = [
        { id: '1-tombstone' },
        { id: 2 },
        { id: 3 },
        { id: '4-tombstone' }
      ];
      tombstoneUtils.isTombstoneId.withArgs('1-tombstone').returns(true);
      tombstoneUtils.isTombstoneId.withArgs('4-tombstone').returns(true);
      tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '1-tombstone' }).returns({ id: 1 });
      tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '4-tombstone' }).returns({ id: 4 });

      controller.__get__('generateTombstones')(results);
      results.should.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
      tombstoneUtils.isTombstoneId.callCount.should.equal(4);
      tombstoneUtils.isTombstoneId.args.should.deep.equal([ ['1-tombstone'], [2], [3], ['4-tombstone'] ]);
      tombstoneUtils.generateChangeFromTombstone.callCount.should.equal(2);
      tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({ id: '1-tombstone' });
      tombstoneUtils.generateChangeFromTombstone.args[1][0].should.deep.equal({ id: '4-tombstone' });
    });
  });

  describe('processChange', () => {
    it('builds the changeObj, to include the results of the view map functions', () => {
      const normalFeeds = controller.__get__('changesFeeds');
      authorization.getViewResults.withArgs({ _id: 1 }).returns({ view1: 'a', view2: 'b' });
      const testFeed = { lastSeq: 0, pendingChanges: [] };
      normalFeeds.push(testFeed);

      controller.__get__('processChange')({ id: 1, doc: { _id: 1 }}, 1);
      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1 },
        viewResults: { view1: 'a', view2: 'b' },
        id: 1
      });
    });

    it('does not update lastseq for feeds', () => {
      const normalFeeds = controller.__get__('changesFeeds');
      const normalFeed = { lastSeq: 0, pendingChanges: [], req: testReq, res: testRes };
      normalFeeds.push(normalFeed);

      controller.__get__('processChange')({ id: 1, doc: { _id: 1 }}, 'seq');
      normalFeed.lastSeq.should.equal(0);
    });

    it('if tombstone change is detected, change content is converted to reflect deleted counterpart', () => {
      const normalFeeds = controller.__get__('changesFeeds');
      const testFeed = { lastSeq: 0, pendingChanges: [], req: testReq, res: testRes};
      authorization.getViewResults.withArgs({ _id: '1-tombstone' }).returns({ view1: 'a', view2: 'b' });

      normalFeeds.push(testFeed);
      tombstoneUtils.isTombstoneId.returns(true);
      tombstoneUtils.generateChangeFromTombstone.returns({ id: 1, changes: [{ rev: 2 }] });
      tombstoneUtils.extractDoc.returns({ _id: 1 });

      controller.__get__('processChange')({ id: '1-tombstone', doc: { _id: '1-tombstone' }}, 'seq');

      tombstoneUtils.isTombstoneId.callCount.should.equal(1);
      tombstoneUtils.isTombstoneId.args[0][0].should.equal('1-tombstone');
      tombstoneUtils.generateChangeFromTombstone.callCount.should.equal(1);
      tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({id: '1-tombstone'});

      authorization.getViewResults.callCount.should.equal(1);
      authorization.getViewResults.args[0][0].should.deep.equal({ _id: '1-tombstone' });

      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1, changes: [{ rev: 2 }] },
        viewResults: { view1: 'a', view2: 'b' },
        id: 1
      });
    });

    it('deletes change doc after view maps are applied to it, to save up memory', () => {
      authorization.getViewResults.withArgs(sinon.match({ _id: 1 })).returns({ view1: 'a', view2: 'b' });
      const change = {
        id: 1,
        changes: [{ rev: 1 }],
        doc: {
          _id: 1,
          someValue: 1
        }
      };

      const normalFeeds = controller.__get__('changesFeeds');
      const testFeed1 = {
        id: 'feed1', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [],
      };
      const testFeed2 = {
        id: 'feed2', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [],
      };
      const testFeed3 = {
        id: 'feed3', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [],
      };
      normalFeeds.push(testFeed1, testFeed2, testFeed3);
      controller.__get__('processChange')(change, 'seq');
      testFeed1.pendingChanges[0].should.deep.equal({ change, viewResults: { view1: 'a', view2: 'b' }, id: 1 });
      testFeed3.pendingChanges[0].should.deep.equal({ change, viewResults: { view1: 'a', view2: 'b' }, id: 1 });
      testFeed2.pendingChanges[0].should.deep.equal({ change, viewResults: { view1: 'a', view2: 'b' }, id: 1 });
      (!!change.doc).should.equal(false);
    });
  });

  describe('writeDownstream', () => {
    it('does not attempt to write if response is finished', () => {
      testRes.finished = true;
      const feed = { res: testRes };
      controller.__get__('writeDownstream')(feed, 'aaa');
      testRes.write.callCount.should.equal(0);
      testRes.end.callCount.should.equal(0);
      testRes.status.callCount.should.equal(0);
    });

    it('does not end response if not specified', () => {
      const feed = { res: testRes };
      controller.__get__('writeDownstream')(feed, 'aaa');
      controller.__get__('writeDownstream')(feed, 'bbb', false);

      testRes.write.callCount.should.equal(2);
      testRes.write.args.should.deep.equal([ ['aaa'], ['bbb'] ]);
      testRes.end.callCount.should.equal(0);
      testRes.status.callCount.should.equal(0);
    });

    it('ends the feed, if specified', () => {
      const feed = { res: testRes };

      controller.__get__('writeDownstream')(feed, 'aaa', true);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0][0].should.equal('aaa');
      testRes.end.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
    });

    it('calls `res.flush` after writing - necessary for compression and heartbeats', () => {
      controller.__get__('writeDownstream')({ res: testRes }, 'aaa', true);
      testRes.write.callCount.should.equal(1);
      testRes.flush.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
    });

    it('sets response status to 500 when feed has errors', () => {
      controller.__get__('writeDownstream')({ res: testRes, error: true }, 'aaa', true);
      testRes.status.callCount.should.equal(1);
      testRes.status.args[0].should.deep.equal([ 500 ]);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0].should.deep.equal([ 'aaa' ]);
    });

    it('does not set response status to 500 when feed has errors and headers are already sent', () => {
      testRes.headersSent = true;
      controller.__get__('writeDownstream')({ res: testRes, error: true }, 'aaa', true);
      testRes.status.callCount.should.equal(0);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0].should.deep.equal([ 'aaa' ]);
    });
  });

  describe('generateResponse', () => {
    it('returns obj with feed results and last seq when no error', () => {
      const feed = { results: 'results', lastSeq: 'lastSeq' };
      controller.__get__('generateResponse')(feed).should.deep.equal({
        results: feed.results,
        last_seq: feed.lastSeq
      });
    });

    it('returns error message when error exists', () => {
      const feed = { results: 'results', lastSeq: 'lastSeq', error: true };
      controller.__get__('generateResponse')(feed).should.deep.equal({ error: 'Error processing your changes' });
    });
  });

  describe('shouldLimitChangesRequests', () => {
    it('should not limit when serverChecks returns some invalid string', () => {
      controller.__get__('shouldLimitChangesRequests')();
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')('dsaddada');
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')([1, 2, 3]);
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')(undefined);
      controller.__get__('limitChangesRequests').should.equal(false);
    });

    it('should not limit when serverChecks returns some lower than minimum version', () => {
      controller.__get__('shouldLimitChangesRequests')('1.7.1');
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')('2.1.1-beta.0');
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')('2.2.9');
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')('1.9.9');
      controller.__get__('limitChangesRequests').should.equal(false);
      controller.__get__('shouldLimitChangesRequests')('1.7.55');
      controller.__get__('limitChangesRequests').should.equal(false);
    });

    it('should limit when serverChecks returns some higher than minimum version', () => {
      controller.__get__('shouldLimitChangesRequests')('2.3.0');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('2.3.1-beta.1');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('2.3.1');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('2.4.0');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('3.0.0');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('3.1.0');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('2.10.0');
      controller.__get__('limitChangesRequests').should.equal(true);
      controller.__get__('shouldLimitChangesRequests')('2.20.0');
      controller.__get__('limitChangesRequests').should.equal(true);
    });
  });

  describe('Document count log', () => {
    it('should not persist log when user name is missing', () => {
      const userCtxA = {};
      const testReqA = Object.assign({ id: 'A' }, testReq, { userCtx: userCtxA });
      const testResA = Object.assign({}, testRes);

      authorization
        .getAllowedDocIds
        .withArgs(sinon.match({ id: 'A' }))
        .resolves(Array.from(Array(20), (a, i) => i));

      controller.request(testReqA, testResA);

      return nextTick()
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          replicationLimitLogService.put.callCount.should.equal(0);
        });
    });

    it('should persist log when users replicate docs', () => {
      const userCtxB = { name: 'userB', facility_id: 'facilityB', contact_id: 'contactB' };
      const testReqB = Object.assign({ id: 'B' }, testReq, { userCtx: userCtxB });
      const testResB = Object.assign({}, testRes);

      authorization
        .getAllowedDocIds
        .withArgs(sinon.match({ id: 'B' }))
        .resolves(Array.from(Array(10500), (a, i) => i));

      controller.request(testReqB, testResB);

      return nextTick()
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          replicationLimitLogService.put.callCount.should.equal(1);
          replicationLimitLogService.put.args[0].should.deep.equal(['userB', 10500]);
        });
    });
  });
});
