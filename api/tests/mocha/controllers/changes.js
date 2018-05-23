const sinon = require('sinon').sandbox.create(),
      auth = require('../../../src/auth'),
      controller = require('../../../src/controllers/changes'),
      authorization = require('../../../src/services/authorization'),
      tombstoneUtils = require('@shared-libs/tombstone-utils'),
      db = require('../../../src/db-pouch'),
      inherits = require('util').inherits,
      EventEmitter = require('events'),
      _ = require('underscore'),
      serverUtils = require('../../../src/server-utils');

const { COUCH_URL, COUCH_NODE_NAME } = process.env;

require('chai').should();
let testReq,
    testRes,
    userCtx,
    ChangesEmitter,
    changesSpy,
    changesCancelSpy,
    clock,
    emitters,
    proxy,
    reqOnClose;

const nextTick = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

describe('Changes controller', () => {
  afterEach(() => {
    sinon.restore();
    clock.restore();
    controller._reset();
    emitters.forEach(emitter => emitter.cancel());
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    emitters = [];
    testReq = { on: sinon.stub().callsFake((event, fn) => reqOnClose = fn)};
    testRes = { type: sinon.stub(), write: sinon.stub(), end: sinon.stub(), setHeader: sinon.stub() };
    userCtx = { name: 'user', facility_id: 'facility', contact_id: 'contact' };
    proxy = { web: sinon.stub() };

    changesSpy = sinon.spy();
    changesCancelSpy = sinon.spy();

    sinon.stub(auth, 'getUserCtx').resolves({ name: 'user' });
    sinon.stub(auth, 'isAdmin').returns(false);
    sinon.stub(auth, 'getUserSettings').resolves(userCtx);

    sinon.stub(authorization, 'getViewResults').returns({});
    sinon.stub(authorization, 'allowedDoc');
    sinon.stub(authorization, 'getDepth').returns(1);
    sinon.stub(authorization, 'getFeedAuthData').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves({});
    sinon.stub(authorization, 'isAuthChange').returns(false);

    sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
    sinon.stub(tombstoneUtils, 'generateChangeFromTombstone');
    sinon.stub(tombstoneUtils, 'extractDoc');

    sinon.stub(serverUtils, 'notLoggedIn');
    sinon.stub(_, 'now').callsFake(Date.now); // force underscore's debounce to use fake timers!

    ChangesEmitter = function(opts) {
      changesSpy(opts);
      EventEmitter.call(this);
      const self = this;

      let complete;
      let completeEmitter = (err, resp) => {
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
      this['catch'] = promise['catch'].bind(promise);
      this.then(result => complete(null, result), complete);
    };
    inherits(ChangesEmitter, EventEmitter);
    const changes = (opts) => {
      const emitter = new ChangesEmitter(opts);
      emitters.push(emitter);
      return emitter;
    };

    db.medic.changes = changes;
    db.medic._ajax = sinon.stub().callsArgWith(1, null, 100);
  });

  describe('init', () => {
    it('initializes the continuous changes feed and used constants', () => {
      db.medic._ajax.callsArgWith(1, null, 20);
      return controller._init().then(() => {
        changesSpy.callCount.should.equal(1);
        changesSpy.args[0][0].should.deep.equal({
          live: true,
          include_docs: true,
          since: 'now',
          timeout: false,
        });
        controller._inited().should.equal(true);
        controller._getContinuousFeed().should.equal(emitters[0]);
        controller._getMaxDocIds().should.equal(20);
        db.medic._ajax.callCount.should.equal(1);
        db.medic._ajax.args[0][0].should.deep.equal({ url:
          COUCH_URL.slice(0, COUCH_URL.indexOf('medic')) +
          `_node/${COUCH_NODE_NAME}/_config/couchdb/changes_doc_ids_optimization_threshold`});
      });
    });

    it('uses default values when config request fails', () => {
      db.medic._ajax.callsArgWith(1, 'error');
      return controller._init().then(() => {
        controller._getMaxDocIds().should.equal(100);
      });
    });

    it('sends changes to be analyzed and updates current seq when changes come in', () => {
      tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      return controller._init().then(() => {
        const emitter = controller._getContinuousFeed();
        emitter.emit('change', { id: 'change' }, 0, 'newseq');
        tombstoneUtils.isTombstoneId.callCount.should.equal(1);
        tombstoneUtils.isTombstoneId.args[0][0].should.equal('change');
        controller._getCurrentSeq().should.equal('newseq');
      });
    });

    it('resets changes listener on error, using last received sequence', () => {
      tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      return controller._init().then(() => {
        const emitter = controller._getContinuousFeed();
        emitter.emit('change', { id: 'change' }, 0, 'seq-1');
        emitter.emit('change', { id: 'change' }, 0, 'seq-2');
        emitter.emit('change', { id: 'change' }, 0, 'seq-3');
        emitter.emit('error');
        return Promise.resolve().then(() => {
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].since.should.equal('seq-3');
        });
      });
    });
  });

  describe('request', () => {
    it('initializes the continuous changes feed', () => {
      auth.isAdmin.returns(true);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          changesSpy.callCount.should.equal(1);
        });
    });

    it('only initializes on first call', () => {
      auth.isAdmin.returns(true);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => controller.request(proxy, testReq, testRes))
        .then(() => controller.request(proxy, testReq, testRes))
        .then(() => controller.request(proxy, testReq, testRes))
        .then(() => {
          changesSpy.callCount.should.equal(1);
        });
    });

    it('sends admin requests through the proxy', () => {
      auth.isAdmin.returns(true);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          proxy.web.callCount.should.equal(1);
          auth.getUserSettings.callCount.should.equal(0);
          testRes.setHeader.callCount.should.equal(0);
        });
    });

    it('pushes non-admin requests to the normal feeds list', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      return controller._init().then(() => {
        return controller
          .request(proxy, testReq, testRes)
          .then(() => {
            proxy.web.callCount.should.equal(0);
            testReq.on.callCount.should.equal(1);
            testReq.on.args[0][0].should.equal('close');
            testRes.type.callCount.should.equal(1);
            testRes.type.args[0][0].should.equal('json');
            auth.getUserSettings.callCount.should.equal(1);
            const feeds = controller._getNormalFeeds();
            feeds.length.should.equal(1);
            testRes.setHeader.callCount.should.equal(0);
          });
      });
    });

    it('sets correct headers when longpoll requests are received', () => {
      auth.isAdmin.returns(true);
      testReq.query = { feed: 'longpoll' };
      return controller._init().then(() => {
        return controller
          .request(proxy, testReq, testRes)
          .then(() => {
            testRes.setHeader.callCount.should.equal(1);
            testRes.setHeader.args[0].should.deep.equal(['X-Accel-Buffering', 'no']);
          });
      });
    });
  });

  describe('initFeed', () => {
    it('initializes feed with default values', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      return controller._init().then(() => {
        const emitter = controller._getContinuousFeed();
        emitter.emit('change', { id: 'change' }, 0, 'seq-1');
        return controller
          .request(proxy, testReq, testRes)
          .then(() => {
            const feed = controller._getNormalFeeds()[0];
            feed.req.should.equal(testReq);
            feed.res.should.equal(testRes);
            feed.userCtx.should.equal(userCtx);
            feed.lastSeq.should.equal('seq-1');
            feed.initSeq.should.equal(0);
            feed.pendingChanges.length.should.equal(0);
            feed.results.length.should.equal(0);
            feed.upstreamRequests.length.should.equal(1);
            feed.limit.should.equal(100);
            feed.should.not.have.property('heartbeat');
            feed.hasOwnProperty('timeout').should.equal(false);
            clock.tick(60000);
            testRes.write.callCount.should.equal(0);
            testRes.end.callCount.should.equal(0);
            controller._getNormalFeeds().length.should.equal(1);
          });
      });
    });

    it('initializes the feed with custom values', () => {
      testReq.query = { limit: 23, heartbeat: 10000, since: 'some-since-655', timeout: 100000 };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.limit.should.equal(23);
          feed.heartbeat.should.be.an('Object');
          feed.timeout.should.be.an('Object');
          clock.tick(82000);
          testRes.write.callCount.should.equal(8);
          testRes.write.args.should.deep.equal([
            ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'] //heartbeats
          ]);
          testRes.end.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(1);
          clock.tick(30000);
          testRes.end.callCount.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('requests user authorization information with correct userCtx', () => {
      const subjectIds = ['s1', 's2', 's3'],
            allowedDocIds = ['d1', 'd2', 'd3'],
            contactsByDepthKeys = [['facility_id']];
      authorization.getFeedAuthData.resolves({ subjectIds, contactsByDepthKeys });
      authorization.getAllowedDocIds.resolves(allowedDocIds);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          authorization.getFeedAuthData.callCount.should.equal(1);
          authorization.getFeedAuthData.withArgs(userCtx).callCount.should.equal(1);
          authorization.getAllowedDocIds.callCount.should.equal(1);
          authorization.getAllowedDocIds.withArgs(sinon.match({ userCtx, subjectIds, contactsByDepthKeys })).callCount.should.equal(1);
          return Promise.resolve();
        })
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.allowedDocIds.should.deep.equal(allowedDocIds);
        });
    });
  });

  describe('getChanges', () => {
    it('requests changes with correct default parameters', () => {
      db.medic._ajax.callsArgWith(1, null, 40);
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: 0,
            doc_ids: ['d1', 'd2', 'd3']
          });
        });
    });

    it('requests changes with correct query parameters', () => {
      testReq.query = { limit: 20, view: 'test', something: 'else', conflicts: true, seq_interval: false, since: '22'};
      db.medic._ajax.callsArgWith(1, null, 40);
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: '22',
            doc_ids: ['d1', 'd2', 'd3'],
            conflicts: true,
            seq_interval: false
          });
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.length.should.equal(1);
        });
    });

    it('splits allowedDocIds into correct sized chunks', () => {
      db.medic._ajax.callsArgWith(1, null, 10);
      const allowedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(allowedIds.slice());

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(5);
          const resultIds = [];
          changesSpy.args.forEach((arg, idx) => {
            if (idx === 0) {
              return;
            }

            arg[0].doc_ids.length.should.equal(10);
            resultIds.push.apply(resultIds, arg[0].doc_ids);
          });
          resultIds.should.deep.equal(allowedIds);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.length.should.equal(4);
        });
    });

    it('cancels all upstream requests and restarts them when one of them fails', () => {
      db.medic._ajax.callsArgWith(1, null, 10);
      const allowedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(allowedIds.slice());

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(5);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests[0].complete('someerror', { status: 'error' });
        })
        .then(nextTick)
        .then(() => {
          let resultIds = [];
          changesSpy.callCount.should.equal(9);
          changesSpy.args.forEach((arg, idx) => {
            if (idx === 0) {
              return;
            }

            arg[0].doc_ids.length.should.equal(10);
            resultIds.push.apply(resultIds, arg[0].doc_ids);
          });
          resultIds.length.should.equal(80);
          resultIds.should.deep.equal(allowedIds.concat(allowedIds));
        });
    });

    it('sends empty response when any of the change feeds are canceled', () => {
      db.medic._ajax.callsArgWith(1, null, 10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 1 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests[0].complete(null, { results: [], last_seq: 22 });
          feed.upstreamRequests[1].cancel();
          feed.upstreamRequests[2].cancel();
          feed.upstreamRequests[3].complete(null, { results: [], last_seq: 44 });
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: [], last_seq: 1 }));
          testRes.end.callCount.should.equal(1);
        });
    });

    it('sends complete response when change feeds are finished', () => {
      db.medic._ajax.callsArgWith(1, null, 10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 0 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests[0].complete(null, { results: [{ id: 1 }, { id: 2 }, { id: 3 }], last_seq: 22 });
          feed.upstreamRequests[3].complete(null, { results: [{ id: 4 }, { id: 5 }, { id: 6 }], last_seq: 33 });
          feed.upstreamRequests[2].complete(null, { results: [], last_seq: 44 });
          feed.upstreamRequests[1].complete(null, { results: [{ id: 7 }, { id: 8 }], last_seq: 55 });
        })
        .then(nextTick)
        .then(() => {
          const concatenatedResults =
                  [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 7 }, { id: 8 }, { id: 4 }, { id: 5 }, { id: 6 }];
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: concatenatedResults, last_seq: 55 }));
          testRes.end.callCount.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('pushes allowed pending changes to the results', () => {
      const validatedIds = Array.from({length: 101}, () => Math.floor(Math.random() * 101));
      authorization.getAllowedDocIds.resolves(validatedIds);
      authorization.allowedDoc.withArgs(sinon.match({ _id: 7 })).returns(false);
      authorization.allowedDoc.withArgs(sinon.match({ _id: 8 })).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(sinon.match({ _id: 9 })).returns(true);
      testReq.query = { since: 0 };

      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          controller._getContinuousFeed().emit('change', { id: 7, changes: [], doc: { _id: 7 } }, 0, 4);
          return Promise.resolve();
        })
        .then(() => {
          controller._getContinuousFeed().emit('change', { id: 8, changes: [], doc: { _id: 8 } }, 0, 5);
          return Promise.resolve();
        })
        .then(() => {
          controller._getContinuousFeed().emit('change', { id: 9, changes: [], doc: { _id: 9 } }, 0, 6);
          return Promise.resolve();
        })
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests[0].complete(null, {
            results: [{ id: 1, changes: [] }, { id: 2, changes: [] }, { id: 3, changes: [] }], last_seq: 3
          });
          feed.upstreamRequests[1].complete(null, {
            results: [{ id: 4, changes: [] }, { id: 5, changes: [] }, { id: 6, changes: [] }], last_seq: 6
          });
        })
        .then(nextTick)
        .then(() => {
          const concatenatedResults = [
            { id: 1, changes: [] }, { id: 2, changes: [] }, { id: 3, changes: [] }, { id: 4, changes: [] },
            { id: 5, changes: [] }, { id: 6, changes: [] }, { id: 8, changes: [] }, { id: 9, changes: [] }
          ];
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: concatenatedResults, last_seq: 6 }));
          testRes.end.callCount.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('when no normal results are received for a non-longpoll, and the results were not canceled, retry', () => {
      db.medic._ajax.callsArgWith(1, null, 10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests[0].complete(null, null);
          feed.upstreamRequests[1].complete(null, false);
          feed.upstreamRequests[2].complete(null, { something: 'else' });
          feed.upstreamRequests[3].complete(null, { results: [{ id: 1 }], last_seq: '22' });
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller._getNormalFeeds();
          feeds.length.should.equal(1);
          const feed = feeds[0];
          feed.upstreamRequests.length.should.equal(4);
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('when no normal results are received for a longpoll request, push to longpollFeeds', () => {
      authorization.getAllowedDocIds.resolves([1, 2]);
      testReq.query = { feed: 'longpoll' };
      testReq.uniqId = 'myUniqueId';
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 1 }));
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(1);
          const feed = controller._getLongpollFeeds()[0];
          feed.id.should.equal('myUniqueId');
          feed.chunkedAllowedDocIds.should.deep.equal([[1, 2]]);
        });
    });

    it('cancels all upstreamRequests when request is closed', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      db.medic._ajax.callsArgWith(1, null, 2);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.length.should.equal(3);
          reqOnClose();
          changesCancelSpy.callCount.should.equal(3);
          testRes.end.callCount.should.equal(0);
          testRes.write.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('resets the feed completely if a breaking authorization change is received', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      authorization.getAllowedDocIds.onCall(1).resolves([42]);
      auth.getUserSettings.onCall(1).resolves({ name: 'user', facility_id: 'facility_id' });

      testReq.uniqId = 'myFeed';
      const userChange = {
        id: 'org.couchdb.user:' + userCtx.name,
        doc: {
          _id: 'org.couchdb.user:' + userCtx.name,
          contact_id: 'otherperson'
        },
        changes: [{ rev: 1 }]
      };
      authorization.allowedDoc.withArgs(userChange.doc).returns(true);
      authorization.isAuthChange.withArgs(userChange.doc).returns(true);

      let initialFeed;

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', userChange, 0, 20);
          initialFeed = controller._getNormalFeeds()[0];
          initialFeed.upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 1 }));
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller._getNormalFeeds();
          feeds.length.should.equal(1);
          controller._getLongpollFeeds().length.should.equal(0);
          feeds[0].should.not.deep.equal(initialFeed);
          feeds[0].id.should.equal('myFeed');
          auth.getUserSettings.callCount.should.equal(2);
          authorization.getFeedAuthData.callCount.should.equal(2);

          authorization.getFeedAuthData.args[1][0].should.deep.equal({ name: 'user', facility_id: 'facility_id' });
          authorization.getAllowedDocIds.callCount.should.equal(2);
          feeds[0].userCtx.should.deep.equal({ name: 'user', facility_id: 'facility_id' });
          initialFeed.ended.should.equal(true);
        });
    });

    it('handles multiple pending changes correctly', () => {
      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          authorization.allowedDoc.withArgs({ _id: 3 })
            .onCall(0).returns(false)
            .onCall(1).returns(true);
          authorization.allowedDoc.withArgs({ _id: 2 })
            .onCall(0).returns(false)
            .onCall(1).returns({ newSubjects: 0 });
          authorization.allowedDoc.withArgs({ _id: 4 })
            .onCall(0).returns(false)
            .onCall(1).returns(false);
          authorization.allowedDoc.withArgs({ _id: 1 })
            .onCall(0).returns({ newSubjects: 1 });

          const emitter = controller._getContinuousFeed();
          const feed = controller._getNormalFeeds()[0];
          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3 }}, 0, 1);
          feed.pendingChanges.length.should.equal(1);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2 }}, 0, 2);
          feed.pendingChanges.length.should.equal(2);
          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4 }}, 0, 3);
          feed.pendingChanges.length.should.equal(3);
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1 }}, 0, 4);
          feed.pendingChanges.length.should.equal(4);

          feed.upstreamRequests.forEach(upstreamReq => {
            upstreamReq.complete(null, { results: [{ id: 22 }], last_seq: 5 });
          });
        })
        .then(nextTick)
        .then(() => {
          testRes.end.callCount.should.equal(1);
          controller._getLongpollFeeds().length.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 22 },
              { id: 1, changes: [] },
              { id: 3, changes: [] },
              { id: 2, changes: [] }
            ],
            last_seq: 5
          }));
          authorization.allowedDoc.withArgs({ _id: 3 }).callCount.should.equal(2);
          authorization.allowedDoc.withArgs({ _id: 2 }).callCount.should.equal(2);
          authorization.allowedDoc.withArgs({ _id: 4 }).callCount.should.equal(2);
          authorization.allowedDoc.withArgs({ _id: 1 }).callCount.should.equal(1);
        });
    });
  });

  describe('handling longpoll feeds in iteration mode', () => {
    it('pushes allowed live changes to the feed results', () => {
      authorization.getAllowedDocIds.resolves(['a', 'b']);
      testReq.query = { feed: 'longpoll' };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 0 }));
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];
          feed.chunkedAllowedDocIds.should.deep.equal([[ 'a', 'b' ]]);
          feed.results.length.should.equal(0);

          authorization.allowedDoc.withArgs({ _id: 1 }).returns({ newSubjects: 0 });
          authorization.allowedDoc.withArgs({ _id: 2 }).returns(true);
          authorization.allowedDoc.withArgs({ _id: 3 }).returns(false);
          authorization.allowedDoc.withArgs({ _id: 4 }).returns({ newSubjects: 0 });
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1 }}, 0, 1);
          feed.limit.should.equal(99);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2 }}, 0, 2);
          feed.limit.should.equal(98);
          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3 }}, 0, 3);
          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4 }}, 0, 4);
          feed.limit.should.equal(97);
          feed.results.length.should.equal(3);
          feed.results.should.deep.equal([{ id: 1, changes: [] }, { id: 2, changes: [] }, { id: 4, changes: [] }]);
          feed.lastSeq.should.equal(4);
          controller._getLongpollFeeds().length.should.equal(1);
        });
    });

    it('debounces ending the feed, capturing rapidly received changes, resets feed timeout every time', () => {
      authorization.getAllowedDocIds.resolves([ 'a', 'b']);
      testReq.query = { feed: 'longpoll', timeout: 50000 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 0 }));
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];
          let feedTimout = feed.timeout;
          feed.chunkedAllowedDocIds.should.deep.equal([[ 'a', 'b' ]]);
          feed.results.length.should.equal(0);

          authorization.allowedDoc.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          feed.limit.should.equal(99);
          feed.timeout.should.not.equal(feedTimout);
          feedTimout = feed.timeout;
          clock.tick(150);
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          feed.limit.should.equal(98);
          feed.timeout.should.not.equal(feedTimout);
          feedTimout = feed.timeout;
          clock.tick(150);
          emitter.emit('change', { id: 4, changes: [] }, 0, 4);
          feed.limit.should.equal(97);
          feed.timeout.should.not.equal(feedTimout);
          testRes.end.callCount.should.equal(0);

          clock.tick(300);
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify(
            { results: [{ id: 1, changes: [] }, { id: 2, changes: [] }, { id: 4, changes: [] }], last_seq: 4 }
          ));
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('immediately sends results when reaching limit of maximum changes', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b']);
      testReq.query = { limit: 4, feed: 'longpoll' };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 0 }));
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];

          authorization.allowedDoc.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          testRes.end.callCount.should.equal(0);
          feed.limit.should.equal(3);
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          testRes.end.callCount.should.equal(0);
          feed.limit.should.equal(2);
          emitter.emit('change', { id: 2, changes: [] }, 0, 3);
          testRes.end.callCount.should.equal(0);
          feed.limit.should.equal(1);
          emitter.emit('change', { id: 3, changes: [] }, 0, 4);
          feed.limit.should.equal(0);
          testRes.end.callCount.should.equal(1);
          emitter.emit('change', { id: 4, changes: [] }, 0, 5);
          emitter.emit('change', { id: 5, changes: [] }, 0, 6);
          feed.results.length.should.equal(3);
          feed.results.should.deep.equal([ { id: 1, changes: [] }, { id: 2, changes: [] },{ id: 3, changes: [] } ]);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify(
            { results: [ { id: 1, changes: [] }, { id: 2, changes: [] },{ id: 3, changes: [] } ], last_seq: 4 }
          ));
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('debounces correctly for multiple concurrent longpoll feeds', () => {
      authorization.getAllowedDocIds.onCall(0).resolves([ 'a', 'b' ]);
      authorization.getAllowedDocIds.onCall(1).resolves([ 1, 2 ]);
      authorization.getAllowedDocIds.onCall(2).resolves([ '*', '-' ]);
      authorization.allowedDoc
        .withArgs(sinon.match({ _id: sinon.match(/^[a-z]+$/) }), sinon.match({ id: 'one' })).returns({ newSubjects: 0 });
      authorization.allowedDoc
        .withArgs(sinon.match({ _id: sinon.match(/^[0-9]+$/) }), sinon.match({ id: 'two' })).returns({ newSubjects: 0 });

      testReq.query = { feed: 'longpoll' };
      testReq.uniqId = 'one';
      const testReq2 = { on: sinon.stub(), uniqId: 'two', query: { feed: 'longpoll' } };
      const testRes2 = { type: sinon.stub(), write: sinon.stub(), end: sinon.stub(), setHeader: sinon.stub() };
      const testReq3 = { on: sinon.stub(), uniqId: 'three', query: { feed: 'longpoll' } };
      const testRes3 = { type: sinon.stub(), write: sinon.stub(), end: sinon.stub(), setHeader: sinon.stub() };

      return Promise
        .all([
          controller.request(proxy, testReq, testRes),
          controller.request(proxy, testReq2, testRes2),
          controller.request(proxy, testReq3, testRes3)
        ])
        .then(nextTick)
        .then(() => {
          const normalFeeds = controller._getNormalFeeds();
          normalFeeds.length.should.equal(3);
          normalFeeds.forEach(feed => {
            feed.upstreamRequests.length.should.equal(1);
            feed.upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 2 }));
          });
          controller._getLongpollFeeds().length.should.equal(0);
        })
        .then(nextTick)
        .then(() => {
          controller._getNormalFeeds().length.should.equal(0);
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', { id: 'a', changes: [], doc: { _id: 'a'}}, 0, 1);
          clock.tick(100);
          emitter.emit('change', { id: '1', changes: [], doc: { _id: '1'}}, 0, 2);
          emitter.emit('change', { id: 'b', changes: [], doc: { _id: 'b'}}, 0, 3);
          clock.tick(100);
          controller._getLongpollFeeds().length.should.equal(3);
          emitter.emit('change', { id: '2', changes: [], doc: { _id: '2'}}, 0, 4);
          emitter.emit('change', { id: '----', changes: [], doc: { _id: '----'}}, 0, 5);
          clock.tick(100);

          // feed 'one' should end at this point
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [ { id: 'a',  changes: [] }, { id: 'b',  changes: [] } ], last_seq: 5
          }));
          controller._getLongpollFeeds().length.should.equal(2);

          emitter.emit('change', { id: '++++',  changes: [], doc: { _id: '++++'}}, 0, 6);
          emitter.emit('change', { id: '2', changes: [], doc: { _id: '2'}}, 0, 7);
          clock.tick(100);
          emitter.emit('change', { id: '++++',  changes: [], doc: { _id: '++++'}}, 0, 8);
          clock.tick(100);

          // feed 'two' should end at this point
          testRes2.end.callCount.should.equal(1);
          testRes2.write.callCount.should.equal(1);
          testRes2.write.args[0][0].should.equal(JSON.stringify({
            results: [ { id: '1',  changes: [] }, { id: '2', changes: [] } ], last_seq: 8
          }));

          // feed 'three' is still waiting
          controller._getLongpollFeeds().length.should.equal(1);
        });
    });

    it('resets the feed when a breaking authorization change is received', () => {
      testReq.query = { feed: 'longpoll' };
      testReq.uniqId = 'myFeed';
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.getAllowedDocIds.onCall(1).resolves([ 'a', 'b', 'c' ]);
      const authChange = { id: 'org.couchdb.user:name', doc: { _id: 'org.couchdb.user:name' } };
      authorization.allowedDoc.withArgs({ _id: 'random' }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 'org.couchdb.user:name' }).returns(true);
      authorization.isAuthChange.withArgs({ _id: 'org.couchdb.user:name' }).returns(true);
      let initialFeed;

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          initialFeed = controller._getNormalFeeds()[0];
          initialFeed.upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          controller._getLongpollFeeds().length.should.equal(1);
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', { id: 'random' }, 0, 2);
          emitter.emit('change', authChange, 0, 3);
        })
        .then(nextTick)
        .then(() => {
          initialFeed.ended.should.equal(true);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          clock.tick(300);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(0);
          const normalFeeds = controller._getNormalFeeds();
          normalFeeds.length.should.equal(1);
          const feed = normalFeeds[0];
          feed.id.should.equal('myFeed');
          feed.chunkedAllowedDocIds.should.deep.equal([[ 'a', 'b', 'c' ]]);
          auth.getUserSettings.callCount.should.equal(2);
          authorization.getAllowedDocIds.callCount.should.equal(2);
        });
    });

    it('handles subjectIds being updated by incoming changes', () => {
      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller
            ._getNormalFeeds()[0]
            .upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          const feed = controller._getLongpollFeeds()[0];
          const emitter = controller._getContinuousFeed();
          authorization.allowedDoc.withArgs({ _id: 3 })
            .onCall(0).returns(false)
            .onCall(1).returns(false)
            .onCall(2).returns(false);
          authorization.allowedDoc.withArgs({ _id: 2 })
            .onCall(0).returns(false)
            .onCall(1).returns(false)
            .onCall(2).returns({ newSubjects: 0 });
          authorization.allowedDoc.withArgs({ _id: 4 })
            .onCall(0).returns(false)
            .onCall(1).returns({ newSubjects: 2 });
          authorization.allowedDoc.withArgs({ _id: 1 })
            .onCall(0).returns({ newSubjects: 2 });

          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3 }}, 0, 1);
          feed.pendingChanges.length.should.equal(1);
          (!!feed.hasNewSubjects).should.equal(false);
          feed.results.length.should.equal(0);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2 }}, 0, 2);
          feed.pendingChanges.length.should.equal(2);
          feed.results.length.should.equal(0);
          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4 }}, 0, 3);
          feed.pendingChanges.length.should.equal(3);
          feed.results.length.should.equal(0);
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1 }}, 0, 4);
          feed.pendingChanges.length.should.equal(3);
          feed.results.length.should.equal(1);
          clock.tick(500);
          testRes.end.callCount.should.equal(1);
          controller._getLongpollFeeds().length.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 1, changes: [] },
              { id: 4, changes: [] },
              { id: 2, changes: [] }
            ],
            last_seq: 4
          }));
        });
    });

    it('does not discard disallowed pendingChanges when switching from normal to longpoll', () => {
      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.allowedDoc.withArgs({ _id: 'report-3' })
        .onCall(0).returns(false)
        .onCall(1).returns(true);
      authorization.allowedDoc.withArgs({ _id: 'report-2' })
        .onCall(0).returns(false)
        .onCall(1).returns(false)
        .onCall(2).returns(false);
      authorization.allowedDoc.withArgs({ _id: 'report-1' })
        .onCall(0).returns(false)
        .onCall(1).returns(true);
      authorization.allowedDoc.withArgs({ _id: 'contact-1' }).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs({ _id: 'contact-2' }).returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', { id: 'report-3', changes: [], doc: { _id: 'report-3'}}, 0, 1);
          emitter.emit('change', { id: 'report-2', changes: [], doc: { _id: 'report-2'}}, 0, 2);
          controller
            ._getNormalFeeds()[0]
            .upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          clock.tick(100);
          emitter.emit('change', { id: 'report-1', changes: [], doc: { _id: 'report-1'}}, 0, 3);
          clock.tick(100);
          emitter.emit('change', { id: 'contact-1', changes: [], doc: { _id: 'contact-1'}}, 0, 4);
          clock.tick(100);
          emitter.emit('change', { id: 'contact-2', changes: [], doc: { _id: 'contact-2'}}, 0, 5);
          const feed = controller._getLongpollFeeds()[0];
          feed.results.length.should.equal(1);
          feed.lastSeq.should.equal(5);
          clock.tick(200);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 'contact-1', changes: [] },
              { id: 'report-3', changes: [] },
              { id: 'report-1', changes: [] }
            ],
            last_seq: 5
          }));

          authorization.allowedDoc.withArgs({ _id: 'report-3' }).callCount.should.equal(2);
          authorization.allowedDoc.withArgs({ _id: 'report-2' }).callCount.should.equal(2);
          authorization.allowedDoc.withArgs({ _id: 'report-1' }).callCount.should.equal(2);
          authorization.allowedDoc.withArgs({ _id: 'contact-1' }).callCount.should.equal(1);
          authorization.allowedDoc.withArgs({ _id: 'contact-2' }).callCount.should.equal(2);
          authorization.allowedDoc.callCount.should.equal(9);
        });
    });

    it('ends the feed when the request is closed', () => {
      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller
            ._getNormalFeeds()[0]
            .upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller._getLongpollFeeds();
          feeds.length.should.equal(1);
          const feed = feeds[0];
          reqOnClose();
          controller._getLongpollFeeds.length.should.equal(0);
          feed.ended.should.equal(true);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
        });
    });

    it('does not process pendingChanges if no new subjects are added', () => {
      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.allowedDoc.withArgs({ _id: 'report-1'}).returns(true);
      authorization.allowedDoc.withArgs({ _id: 'report-2'}).returns(false);
      authorization.allowedDoc.withArgs({ _id: 'report-3'}).returns(false);
      authorization.allowedDoc.withArgs({ _id: 'report-4'}).returns(false);
      authorization.allowedDoc.withArgs({ _id: 'contact-1'}).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 'contact-2'}).returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller
            ._getNormalFeeds()[0]
            .upstreamRequests.forEach(upstreamReq => upstreamReq.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          const feed = controller._getLongpollFeeds()[0];
          const emitter = controller._getContinuousFeed();
          clock.tick(100);
          emitter.emit('change', { id: 'report-1', changes: [], doc: { _id: 'report-1'}}, 0, 3);
          emitter.emit('change', { id: 'report-2', changes: [], doc: { _id: 'report-2'}}, 0, 3);
          emitter.emit('change', { id: 'report-3', changes: [], doc: { _id: 'report-3'}}, 0, 3);
          emitter.emit('change', { id: 'report-4', changes: [], doc: { _id: 'report-4'}}, 0, 3);
          clock.tick(100);
          emitter.emit('change', { id: 'contact-1', changes: [], doc: { _id: 'contact-1'}}, 0, 4);
          clock.tick(100);
          emitter.emit('change', { id: 'contact-2', changes: [], doc: { _id: 'contact-2'}}, 0, 5);
          feed.results.length.should.equal(2);
          feed.lastSeq.should.equal(5);
          clock.tick(200);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 'report-1', changes: [] },
              { id: 'contact-1', changes: [] }
            ],
            last_seq: 5
          }));

          authorization.allowedDoc.withArgs({ _id: 'report-1' }).callCount.should.equal(1);
          authorization.allowedDoc.withArgs({ _id: 'report-2' }).callCount.should.equal(1);
          authorization.allowedDoc.withArgs({ _id: 'report-3' }).callCount.should.equal(1);
          authorization.allowedDoc.withArgs({ _id: 'report-4' }).callCount.should.equal(1);
          authorization.allowedDoc.withArgs({ _id: 'contact-1' }).callCount.should.equal(1);
          authorization.allowedDoc.withArgs({ _id: 'contact-2' }).callCount.should.equal(1);
          authorization.allowedDoc.callCount.should.equal(6);
        });
    });
  });

  describe('handling longpoll feeds in restart mode', () => {
    it('sends results directly if no new subjects are added', () => {
      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      controller._setMode('not-iteration');
      authorization.allowedDoc.withArgs({ _id: 1 }).returns(true);
      authorization.allowedDoc.withArgs({ _id: 2 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 3 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 4 }).returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller._getNormalFeeds().forEach(feed => {
            feed.upstreamRequests.forEach(upstreamReq => {
              upstreamReq.complete(null, { results: [], last_seq: 5 });
            });
          });
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}, 0, 1);
          emitter.emit('change', { id: 2, changes: [{ rev: 1 }], doc: { _id: 2 }}, 0, 2);
          emitter.emit('change', { id: 3, changes: [{ rev: 1 }], doc: { _id: 3 }}, 0, 3);
          emitter.emit('change', { id: 4, changes: [{ rev: 1 }], doc: { _id: 4 }}, 0, 4);
          clock.tick(300);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [
              { id: 1, changes: [{ rev: 1 }]},
              { id: 3, changes: [{ rev: 1 }]}
            ],
            last_seq: 4
          }));
          authorization.getAllowedDocIds.callCount.should.equal(1);
        });
    });

    it('resets the feed to being a normal feed if new subjects are added', () => {
      db.medic._ajax.callsArgWith(1, null, 2);
      testReq.query = { feed: 'longpoll', since: 'seq' };
      testReq.uniqId = 'myFeed';
      authorization.getFeedAuthData.resolves({ subjectIds: ['a', 'b'], contactsByDepthKeys: []});
      authorization.getAllowedDocIds.onCall(0).resolves([ 'a', 'b' ]);
      authorization.getAllowedDocIds.onCall(1).resolves([ 'a', 'b', 'c', 'd' ]);
      controller._setMode('not-iteration');
      authorization.allowedDoc.withArgs({ _id: 1 }).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs({ _id: 2 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 3 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 4 }).returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            doc_ids: ['a', 'b'],
            since: 'seq'
          });
          controller._getNormalFeeds().forEach(feed => {
            feed.upstreamRequests.forEach(upstreamReq => {
              upstreamReq.complete(null, { results: [], last_seq: 5 });
            });
          });
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];
          controller._getNormalFeeds().length.should.equal(0);
          emitter.emit('change', { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}, 0, 1);
          emitter.emit('change', { id: 2, changes: [{ rev: 1 }], doc: { _id: 2 }}, 0, 2);
          emitter.emit('change', { id: 3, changes: [{ rev: 1 }], doc: { _id: 3 }}, 0, 3);
          emitter.emit('change', { id: 4, changes: [{ rev: 1 }], doc: { _id: 4 }}, 0, 4);
          feed.lastSeq.should.equal(4);
          clock.tick(300);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(0);
          const normalFeeds = controller._getNormalFeeds();
          normalFeeds.length.should.equal(1);
          normalFeeds[0].id.should.equal(feed.id);
          feed.pendingChanges.should.deep.equal([]);
          feed.results.should.deep.equal([]);
          feed.lastSeq.should.equal(feed.initSeq);
          feed.chunkedAllowedDocIds.should.equal(false);
          feed.hasNewSubjects.should.equal(false);
          feed.subjectIds = ['a', 'b', 'c'];
        })
        .then(nextTick)
        .then(() => {
          authorization.getFeedAuthData.callCount.should.equal(1);
          authorization.getAllowedDocIds.callCount.should.equal(2);

          changesSpy.callCount.should.equal(4);
          changesSpy.args[2][0].should.deep.equal({
            doc_ids: ['a', 'b'],
            since: 'seq'
          });
          changesSpy.args[3][0].should.deep.equal({
            doc_ids: ['c', 'd'],
            since: 'seq'
          });

          controller._getLongpollFeeds().length.should.equal(0);
          const feed = controller._getNormalFeeds()[0];
          feed.id.should.equal(testReq.uniqId);
          feed.upstreamRequests.length.should.equal(2);
          feed.chunkedAllowedDocIds.should.deep.equal([[ 'a', 'b' ],[ 'c', 'd' ]]);

          feed.upstreamRequests[0].complete(null, { results: [{ id: 1, changes: [{ rev: 1 }] }], last_seq: 4 });
          feed.upstreamRequests[1].complete(null,
            { results: [{ id: 3, changes: [{ rev: 1 }] }, { id: 7, changes: [{ rev: 1 }] }], last_seq: 5 });
        })
        .then(nextTick)
        .then(() => {
          controller._getLongpollFeeds().length.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [{ id: 1, changes: [{ rev: 1 }]}, { id: 3, changes: [{ rev: 1 }]}, { id: 7, changes: [{ rev: 1 }]}],
            last_seq: 5
          }));
        });
    });
  });

  describe('handling heartbeats', () => {
    it('does not send heartbeat if not defined', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b']);
      testReq.query = { feed: 'longpoll' };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          clock.tick(20000);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          clock.tick(40000);
          testRes.write.callCount.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('does send heartbeat during the whole execution, while normal and longpoll', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b']);
      testReq.query = { feed: 'longpoll', heartbeat: 5000 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick())
        .then(() => {
          clock.tick(20000);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          clock.tick(40000);
          testRes.write.callCount.should.equal(12);
          for (let i = 0; i < 12 ; i++) {
            testRes.write.args[i][0].should.equal('\n');
          }
          controller._getLongpollFeeds().length.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });
  });

  describe('handling timeouts', () => {
    it('creates a neverending feed if no timeout is set', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b']);
      testReq.query = { feed: 'longpoll' };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          clock.tick(20000);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          clock.tick(400000000);
          testRes.write.callCount.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('cancels all upstreamRequests when the timeout is reached', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      db.medic._ajax.callsArgWith(1, null, 2);
      testReq.query = { timeout: 50000 };
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.length.should.equal(3);
          clock.tick(50000);
          changesCancelSpy.callCount.should.equal(3);
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
        });
    });

    it('sends empty result on timeout when no allowed changes are received, returning last seq', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b']);
      testReq.query = { feed: 'longpoll', timeout: 60000, since: 2 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 2 }));
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];
          emitter.emit('change', { id: 1, changes: [] }, 0, 3);
          clock.tick(10000);
          emitter.emit('change', { id: 2, changes: [] }, 0, 4);
          clock.tick(10000);
          emitter.emit('change', { id: 3, changes: [] }, 0, 5);
          clock.tick(10000);
          emitter.emit('change', { id: 4, changes: [] }, 0, 6);
          clock.tick(10000);
          feed.results.length.should.equal(0);
          clock.tick(20000);

          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: [], last_seq: 6 }));
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });
  });

  describe('appendChange', () => {
    it('appends unknown ID change to the list', () => {
      const results = [{ id: 1 }, { id: 2 }],
            changeObj = { change: { id: 3 } };

      controller._appendChange(results, changeObj);
      results.length.should.equal(3);
      results.should.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('appends unknown revs to the revs list', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }] },
        { id: 3, changes: [{ rev: 1 }] }
      ];
      const changeObj = { change: { id: 2, changes: [{ rev: 1 }, { rev: 2}] } };
      controller._appendChange(results, changeObj);
      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }, { rev: 2 }] },
        { id: 3, changes: [{ rev: 1 }] }
      ]);
    });

    it('does not append change doc property', () => {
      // todo
    });
  });

  describe('processPendingChanges', () => {
    it('filters authorized changes and appends then to the results list', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }] }
      ];
      const pendingChanges = [
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 } } },
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 } } },
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 } } },
        { change: { id: 4, changes: [{ rev: 1 }], doc: { _id: 4 } } },
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 } } },
      ];
      authorization.allowedDoc.withArgs({ _id: 1 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 2 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 3 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 4 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 5 }).returns(true);

      controller._processPendingChanges({ pendingChanges, userCtx, results }, true).should.equal(true);
      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 5, changes: [{ rev: 1 }] }
      ]);
    });

    it('returns correct authChange value when user doc change is received', () => {
      authorization.allowedDoc.withArgs({ _id: 1 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 2 }).returns(true);
      authorization.allowedDoc.withArgs({ _id: 3 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 'org.couchdb.user:user'}).returns(true);
      authorization.allowedDoc.withArgs({ _id: 5 }).returns({ newSubjects: 0 });
      authorization.isAuthChange.withArgs({ _id: 'org.couchdb.user:user'}).returns(true);

      const results = [
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }] }
      ];
      const pendingChanges = [
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}},
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 }}},
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 }}},
        { change: { id: 'org.couchdb.user:user', changes: [{ rev: 1 }], doc: { _id: 'org.couchdb.user:user' }}},
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 }}},
      ];

      controller._processPendingChanges({ pendingChanges, results }, true).should.equal(false);
      results.length.should.equal(3);
    });

    it('reiterates over pending changes every time an allowed change increases the subjects list, removes allowed changes from list', () => {
      const changes = [
        { change: { id: 6, changes: [{ rev: 1 }], doc: { _id: 6 }}},
        { change: { id: 7, changes: [{ rev: 1 }], doc: { _id: 7 }}},
        { change: { id: 8, changes: [{ rev: 1 }], doc: { _id: 8 }}},
        { change: { id: 4, changes: [{ rev: 1 }], doc: { _id: 4 }}},
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 }}},
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 }}},
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 }}},
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}}
      ];
      const feed = { pendingChanges: changes, results: [] };
      authorization.allowedDoc.withArgs({ _id: 1 }).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs({ _id: 2 })
        .onCall(0).returns(false)
        .onCall(1).returns({ newSubjects: 2 });

      authorization.allowedDoc.withArgs({ _id: 3 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 4 })
        .onCall(0).returns(false)
        .onCall(1).returns(false)
        .onCall(2).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 5 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 6 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 7 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 8 }).returns(false);

      controller._processPendingChanges(feed, true).should.equal(true);

      authorization.allowedDoc.withArgs({ _id: 1 }).callCount.should.equal(1);
      authorization.allowedDoc.withArgs({ _id: 2 }).callCount.should.equal(2);
      authorization.allowedDoc.withArgs({ _id: 3 }).callCount.should.equal(3);
      authorization.allowedDoc.withArgs({ _id: 4 }).callCount.should.equal(3);
      authorization.allowedDoc.withArgs({ _id: 5 }).callCount.should.equal(3);
      authorization.allowedDoc.withArgs({ _id: 6 }).callCount.should.equal(3);
      authorization.allowedDoc.withArgs({ _id: 7 }).callCount.should.equal(3);
      authorization.allowedDoc.withArgs({ _id: 8 }).callCount.should.equal(3);
      authorization.allowedDoc.callCount.should.equal(21);

      feed.pendingChanges.length.should.equal(5);
      feed.pendingChanges.every(change => [3, 5, 6, 7, 8].indexOf(change.change.id) !== -1).should.equal(true);
    });

    it('does not reiterate when allowed changes do not modify the subjects list', () => {
      const pendingChanges = [
        { change: { id: 4, changes: [{ rev: 1 }], doc: { _id: 4 }}},
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 }}},
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 }}},
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 }}},
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}}
      ];
      const feed = { pendingChanges, results: [] };
      authorization.allowedDoc.withArgs({ _id: 1 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 2 }).returns(false);
      authorization.allowedDoc.withArgs({ _id: 3 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 4 }).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs({ _id: 5 }).returns(false);

      controller._processPendingChanges(feed, true).should.equal(true);
      feed.results.length.should.equal(3);
      feed.results.should.deep.equal([
        { id: 4, changes: [{ rev: 1 }]},
        { id: 3, changes: [{ rev: 2 }]},
        { id: 1, changes: [{ rev: 1 }]}
      ]);
      authorization.allowedDoc.callCount.should.equal(5);
    });

    it('does not check for changes in auth for longpoll feeds', () => {
      const pendingChanges = [
        { change: { id: 4, changes: [{ rev: 1 }], doc: { _id: 4 }}},
        { change: { id: 5, changes: [{ rev: 1 }], doc: { _id: 5 }}},
        { change: { id: 2, changes: [{ rev: 2 }], doc: { _id: 2 }}},
        { change: { id: 3, changes: [{ rev: 2 }], doc: { _id: 3 }}},
        { change: { id: 1, changes: [{ rev: 1 }], doc: { _id: 1 }}}
      ];

      controller._processPendingChanges({ pendingChanges, hasNewSubjects: true }).should.equal(true);
      authorization.isAuthChange.callCount.should.equal(0);
      authorization.allowedDoc.callCount.should.equal(5);
    });
  });

  describe('mergeResults', () => {
    it('merges results from multiple changes feed responses', () => {
      const responses = [
        { results: [{ id: 1 }, { id: 2 }] },
        { results: [{ id: 3 }, { id: 4 }] },
        { results: [] },
        { results: [{ id: 5 }] }
      ];

      const actual = controller._mergeResults(responses);
      actual.length.should.equal(5);
      actual.should.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ]);
    });

    it('converts tombstone changes to their original document counterparts', () => {
      const responses = [
        { results: [{ id: '1-tombstone' }, { id: 2 }] },
        { results: [{ id: 3 }, { id: '4-tombstone' }] },
      ];
      tombstoneUtils.isTombstoneId.withArgs('1-tombstone').returns(true);
      tombstoneUtils.isTombstoneId.withArgs('4-tombstone').returns(true);
      tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '1-tombstone' }).returns({ id: 1 });
      tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '4-tombstone' }).returns({ id: 4 });

      const actual = controller._mergeResults(responses);
      actual.length.should.equal(4);
      actual.should.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
      tombstoneUtils.isTombstoneId.callCount.should.equal(4);
      tombstoneUtils.isTombstoneId.args.should.deep.equal([ ['1-tombstone'], [2], [3], ['4-tombstone'] ]);
      tombstoneUtils.generateChangeFromTombstone.callCount.should.equal(2);
      tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({ id: '1-tombstone' });
      tombstoneUtils.generateChangeFromTombstone.args[1][0].should.deep.equal({ id: '4-tombstone' });
    });
  });

  describe('processChange', () => {
    it('builds the changeObj, to include the results of the view map functions', () => {
      const normalFeeds = controller._getNormalFeeds();
      authorization.getViewResults.withArgs({ _id: 1 }).returns({ view1: 'a', view2: 'b' });
      const testFeed = { lastSeq: 0, pendingChanges: [] };
      normalFeeds.push(testFeed);

      controller._processChange({ id: 1, doc: { _id: 1 }}, 1);
      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1, doc: { _id: 1 }},
        viewResults: { view1: 'a', view2: 'b' }
      });
    });

    it('updates the lastSeq property of all normal and longpoll feeds', () => {
      const normalFeeds = controller._getNormalFeeds();
      const longpollFeeds = controller._getLongpollFeeds();
      const normalFeed = { lastSeq: 0, pendingChanges: [], req: testReq, res: testRes };
      const longpollFeed = { lastSeq: 0, pendingChanges: [], results: [], req: testReq, res: testRes };
      normalFeeds.push(normalFeed);
      longpollFeeds.push(longpollFeed);

      controller._processChange({ id: 1, doc: { _id: 1 }}, 'seq');
      normalFeed.lastSeq.should.equal('seq');
      longpollFeed.lastSeq.should.equal('seq');
    });

    it('if tombstone change is detected, change content is converted to reflect deleted counterpart', () => {
      const normalFeeds = controller._getNormalFeeds();
      const testFeed = { lastSeq: 0, pendingChanges: [], req: testReq, res: testRes};
      authorization.getViewResults.withArgs({ _id: '1-tombstone' }).returns({ view1: 'a', view2: 'b' });

      normalFeeds.push(testFeed);
      tombstoneUtils.isTombstoneId.returns(true);
      tombstoneUtils.generateChangeFromTombstone.returns({ id: 1, changes: [{ rev: 2 }] });
      tombstoneUtils.extractDoc.returns({ _id: 1 });

      controller._processChange({ id: '1-tombstone', doc: { _id: '1-tombstone' }}, 'seq');

      tombstoneUtils.isTombstoneId.callCount.should.equal(1);
      tombstoneUtils.isTombstoneId.args[0][0].should.equal('1-tombstone');
      tombstoneUtils.generateChangeFromTombstone.callCount.should.equal(1);
      tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({
        id: '1-tombstone',
        doc: { _id: '1-tombstone' }
      });

      authorization.getViewResults.callCount.should.equal(1);
      authorization.getViewResults.args[0][0].should.deep.equal({ _id: '1-tombstone' });

      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1, changes: [{ rev: 2 }] },
        viewResults: { view1: 'a', view2: 'b' }
      });
    });

    it('pushes the change to the results of longpoll feeds, if allowed, otherwise only updates seq', () => {
      authorization.getViewResults.withArgs({ _id: 1 }).returns({ view1: 'a', view2: 'b' });
      authorization.allowedDoc.withArgs({ _id: 1 }, sinon.match({ id: 'feed1' })).returns(true);
      authorization.allowedDoc.withArgs({ _id: 1 }, sinon.match({ id: 'feed2' })).returns(false);
      authorization.allowedDoc.withArgs({ _id: 1 }, sinon.match({ id: 'feed3' })).returns(true);

      const longpollFeeds = controller._getLongpollFeeds();
      const testFeed1 = { id: 'feed1', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [] };
      const testFeed2 = { id: 'feed2', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [] };
      const testFeed3 = { id: 'feed3', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [] };
      longpollFeeds.push(testFeed1, testFeed2, testFeed3);

      controller._processChange({ id: 1, doc: { _id: 1 }}, 'seq');
      testFeed1.lastSeq.should.equal('seq');
      testFeed2.lastSeq.should.equal('seq');
      testFeed3.lastSeq.should.equal('seq');

      testFeed1.results.length.should.equal(1);
      testFeed2.results.length.should.equal(0);
      testFeed3.results.length.should.equal(1);

      testFeed1.results[0].should.deep.equal({ id: 1 });
      testFeed3.results[0].should.deep.equal({ id: 1 });
    });
  });

  describe('writeDownstream', () => {
    it('does not attempt to write if response is finished', () => {
      testRes.finished = true;
      const feed = { res: testRes };
      controller._writeDownstream(feed, 'aaa');
      testRes.write.callCount.should.equal(0);
      testRes.end.callCount.should.equal(0);
    });

    it('does not end response if not specified', () => {
      const feed = { res: testRes };
      controller._writeDownstream(feed, 'aaa');
      controller._writeDownstream(feed, 'bbb', false);

      testRes.write.callCount.should.equal(2);
      testRes.write.args.should.deep.equal([ ['aaa'], ['bbb'] ]);
      testRes.end.callCount.should.equal(0);
    });

    it('ends the feed, if specified', () => {
      const feed = { res: testRes };

      controller._writeDownstream(feed, 'aaa', true);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0][0].should.equal('aaa');
      testRes.end.callCount.should.equal(1);
    });
  });
});
