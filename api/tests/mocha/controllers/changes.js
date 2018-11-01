const sinon = require('sinon').sandbox.create(),
      auth = require('../../../src/auth'),
      controller = require('../../../src/controllers/changes'),
      authorization = require('../../../src/services/authorization'),
      tombstoneUtils = require('@shared-libs/tombstone-utils'),
      db = require('../../../src/db-pouch'),
      inherits = require('util').inherits,
      EventEmitter = require('events'),
      _ = require('underscore'),
      serverUtils = require('../../../src/server-utils'),
      config = require('../../../src/config');

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
    reqOnClose,
    defaultSettings;

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
    testRes = {
      type: sinon.stub(),
      write: sinon.stub(),
      end: sinon.stub(),
      setHeader: sinon.stub(),
      flush: sinon.stub(),
      status: sinon.stub()
    };
    userCtx = { name: 'user', facility_id: 'facility', contact_id: 'contact' };
    proxy = { web: sinon.stub() };

    defaultSettings = {
      reiterate_changes: true,
      changes_limit: 100,
      debounce_interval: 200
    };

    changesSpy = sinon.spy();
    changesCancelSpy = sinon.spy();

    sinon.stub(auth, 'getUserCtx').resolves({ name: 'user' });
    sinon.stub(auth, 'isOnlineOnly').returns(false);
    sinon.stub(auth, 'getUserSettings').resolves(userCtx);

    sinon.stub(authorization, 'getViewResults').returns({});
    sinon.stub(authorization, 'allowedDoc');
    sinon.stub(authorization, 'getDepth').returns(1);
    sinon.stub(authorization, 'getUserAuthorizationData').resolves({});
    sinon.stub(authorization, 'getAllowedDocIds').resolves({});
    sinon.stub(authorization, 'isAuthChange').returns(false);

    sinon.stub(tombstoneUtils, 'isTombstoneId').returns(false);
    sinon.stub(tombstoneUtils, 'generateChangeFromTombstone');
    sinon.stub(tombstoneUtils, 'extractDoc');

    sinon.stub(serverUtils, 'notLoggedIn');
    sinon.stub(_, 'now').callsFake(Date.now); // force underscore's debounce to use fake timers!
    sinon.stub(config, 'get').returns(defaultSettings);

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

    sinon.stub(db.medic, 'changes').callsFake(opts => {
      const emitter = new ChangesEmitter(opts);
      emitters.push(emitter);
      return emitter;
    });
  });

  describe('init', () => {
    it('initializes the continuous changes feed and used constants', () => {
      defaultSettings.reiterate_changes = false;
      controller._init();
      changesSpy.callCount.should.equal(1);
      changesSpy.args[0][0].should.deep.equal({
        live: true,
        include_docs: true,
        since: 'now',
        timeout: false,
      });
      controller._inited().should.equal(true);
      controller._getContinuousFeed().should.equal(emitters[0]);
    });

    it('sends changes to be analyzed and updates current seq when changes come in', () => {
      tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      controller._init();
      const emitter = controller._getContinuousFeed();
      emitter.emit('change', { id: 'change' }, 0, 'newseq');
      tombstoneUtils.isTombstoneId.callCount.should.equal(1);
      tombstoneUtils.isTombstoneId.args[0][0].should.equal('change');
      controller._getCurrentSeq().should.equal('newseq');
    });

    it('resets changes listener on error, using last received sequence', () => {
      tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      controller._init();
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

  describe('request', () => {
    it('initializes the continuous changes feed', () => {
      auth.isOnlineOnly.returns(true);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          changesSpy.callCount.should.equal(1);
        });
    });

    it('only initializes on first call', () => {
      auth.isOnlineOnly.returns(true);
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
      auth.isOnlineOnly.returns(true);
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
      controller._init();
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

  describe('initFeed', () => {
    it('initializes feed with default values', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      controller._init();
      const emitter = controller._getContinuousFeed();
      emitter.emit('change', { id: 'change' }, 0, 'seq-1');
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.req.should.equal(testReq);
          feed.res.should.equal(testRes);
          feed.userCtx.should.equal(userCtx);
          feed.lastSeq.should.equal('seq-1');
          feed.initSeq.should.equal(0);
          feed.pendingChanges.length.should.equal(0);
          feed.results.length.should.equal(0);
          feed.limit.should.equal(100);
          feed.should.not.have.property('heartbeat');
          feed.should.not.have.property('timeout');
          feed.reiterate_changes.should.equal(true);
          feed.debounceEnd.should.be.a('function');
          clock.tick(60000);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(1);
        });
    });

    it('initializes the feed with custom values', () => {
      testReq.query = { limit: 23, heartbeat: 10000, since: 'some-since-655', timeout: 100000 };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      defaultSettings.reiterate_changes = 'something';
      defaultSettings.debounce_interval = false;
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
          feed.reiterate_changes.should.equal('something');
          feed.should.not.have.property('debouncedEnd');
        });
    });

    it('requests user authorization information with correct userCtx', () => {
      const subjectIds = ['s1', 's2', 's3'],
            allowedDocIds = ['d1', 'd2', 'd3'],
            contactsByDepthKeys = [['facility_id']];
      authorization.getUserAuthorizationData.resolves({ subjectIds, contactsByDepthKeys });
      authorization.getAllowedDocIds.resolves(allowedDocIds);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(1);
          authorization.getUserAuthorizationData.withArgs(userCtx).callCount.should.equal(1);
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
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          authorization.getAllowedDocIds.callCount.should.equal(1);
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: 0,
            batch_size: 4,
            doc_ids: ['d1', 'd2', 'd3']
          });
        });
    });

    it('requests changes with correct query parameters', () => {
      testReq.query = { limit: 20, view: 'test', something: 'else', conflicts: true, seq_interval: false, since: '22'};
      authorization.getAllowedDocIds.resolves(['d1', 'd2', 'd3']);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: '22',
            batch_size: 4,
            doc_ids: ['d1', 'd2', 'd3'],
            conflicts: true,
            seq_interval: false
          });
        });
    });

    it('sends empty response when the change feed is canceled', () => {
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 1 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequest.cancel();
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: [], last_seq: 1 }));
          testRes.end.callCount.should.equal(1);
        });
    });

    it('sends complete response when change feeds are finished', () => {
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);
      testReq.query = { since: 0 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequest.complete(null, { results: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 7 }, { id: 8 }, { id: 4 }, { id: 5 }, { id: 6 }], last_seq: 55 });
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
      authorization.allowedDoc.withArgs(7).returns(false);
      authorization.allowedDoc.withArgs(8).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(9).returns(true);
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
          feed.upstreamRequest.complete(null, {
            results: [{ id: 5, changes: [] }, { id: 6, changes: [] }], last_seq: 6
          });
        })
        .then(nextTick)
        .then(() => {
          const concatenatedResults = [
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
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getAllowedDocIds.resolves(validatedIds);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequest.complete(null, { something: 'else' });
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller._getNormalFeeds();
          feeds.length.should.equal(1);
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('when no normal results are received for a longpoll request, push to longpollFeeds', () => {
      authorization.getAllowedDocIds.resolves([1, 2]);
      testReq.query = { feed: 'longpoll' };
      testReq.id = 'myUniqueId';
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequest.complete(null, { results: [], last_seq: 1 });
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(1);
          const feed = controller._getLongpollFeeds()[0];
          feed.id.should.equal('myUniqueId');
          feed.allowedDocIds.should.deep.equal([1, 2]);
        });
    });

    it('cancels upstreamRequest when request is closed', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          reqOnClose();
          changesCancelSpy.callCount.should.equal(1);
          testRes.end.callCount.should.equal(0);
          testRes.write.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('resets the feed completely if a breaking authorization change is received', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      authorization.getAllowedDocIds.onCall(1).resolves([42]);
      auth.getUserSettings.onCall(1).resolves({ name: 'user', facility_id: 'facility_id' });

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

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', userChange, 0, 20);
          initialFeed = controller._getNormalFeeds()[0];
          initialFeed.upstreamRequest.complete(null, { results: [], last_seq: 1 });
        })
        .then(nextTick)
        .then(() => {
          const feeds = controller._getNormalFeeds();
          feeds.length.should.equal(1);
          controller._getLongpollFeeds().length.should.equal(0);
          feeds[0].should.not.deep.equal(initialFeed);
          feeds[0].id.should.equal('myFeed');
          auth.getUserSettings.callCount.should.equal(2);
          authorization.getUserAuthorizationData.callCount.should.equal(2);

          authorization.getUserAuthorizationData.args[1][0].should.deep.equal({ name: 'user', facility_id: 'facility_id' });
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
          authorization.allowedDoc.withArgs(3)
            .onCall(0).returns(false)
            .onCall(1).returns(true);
          authorization.allowedDoc.withArgs(2)
            .onCall(0).returns(false)
            .onCall(1).returns({ newSubjects: 0 });
          authorization.allowedDoc.withArgs(4)
            .onCall(0).returns(false)
            .onCall(1).returns(false);
          authorization.allowedDoc.withArgs(1)
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

          feed.upstreamRequest.complete(null, { results: [{ id: 22 }], last_seq: 5 });
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
          authorization.allowedDoc.withArgs(3).callCount.should.equal(2);
          authorization.allowedDoc.withArgs(2).callCount.should.equal(2);
          authorization.allowedDoc.withArgs(4).callCount.should.equal(2);
          authorization.allowedDoc.withArgs(1).callCount.should.equal(1);
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
          feed.upstreamRequest.complete(null, { results: [], last_seq: 0 });
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];
          feed.allowedDocIds.should.deep.equal([ 'a', 'b' ]);
          feed.results.length.should.equal(0);

          authorization.allowedDoc.withArgs(1).returns({ newSubjects: 0 });
          authorization.allowedDoc.withArgs(2).returns(true);
          authorization.allowedDoc.withArgs(3).returns(false);
          authorization.allowedDoc.withArgs(4).returns({ newSubjects: 0 });
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

    it('debounces ending the feed, capturing rapidly received changes, cancels feed timeout', () => {
      authorization.getAllowedDocIds.resolves([ 'a', 'b']);
      testReq.query = { feed: 'longpoll', timeout: 50000 };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequest.complete(null, { results: [], last_seq: 0 });
        })
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          const feed = controller._getLongpollFeeds()[0];
          let feedTimeout = feed.timeout;
          feed.allowedDocIds.should.deep.equal([ 'a', 'b' ]);
          feed.results.length.should.equal(0);
          authorization.allowedDoc.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          feed.limit.should.equal(99);
          _.each(clock.timers, (timer, index) => {
            index.should.not.equal(feedTimeout.id);
            timer.delay.should.not.equal(50000);
          });
          clock.tick(150);
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          feed.limit.should.equal(98);
          _.each(clock.timers, (timer, index) => {
            index.should.not.equal(feedTimeout.id);
            timer.delay.should.not.equal(50000);
          });
          clock.tick(150);
          emitter.emit('change', { id: 4, changes: [] }, 0, 4);
          feed.limit.should.equal(97);
          _.each(clock.timers, (timer, index) => {
            index.should.not.equal(feedTimeout.id);
            timer.delay.should.not.equal(50000);
          });
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
          feed.upstreamRequest.complete(null, { results: [], last_seq: 0 });
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
        .withArgs(sinon.match(/^[a-z]+$/), sinon.match({ id: 'one' })).returns({ newSubjects: 0 });
      authorization.allowedDoc
        .withArgs(sinon.match(/^[0-9]+$/), sinon.match({ id: 'two' })).returns({ newSubjects: 0 });

      testReq.query = { feed: 'longpoll' };
      testReq.id = 'one';
      const testReq2 = { on: sinon.stub(), id: 'two', query: { feed: 'longpoll' } };
      const testRes2 = {
        type: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub(),
        setHeader: sinon.stub(),
        flush: sinon.stub()
      };
      const testReq3 = { on: sinon.stub(), id: 'three', query: { feed: 'longpoll' } };
      const testRes3 = {
        type: sinon.stub(),
        write: sinon.stub(),
        end: sinon.stub(),
        setHeader: sinon.stub(),
        flush: sinon.stub()
      };

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
            feed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
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
      testReq.id = 'myFeed';
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.getAllowedDocIds.onCall(1).resolves([ 'a', 'b', 'c' ]);
      const authChange = { id: 'org.couchdb.user:name' };
      authorization.allowedDoc.withArgs('random').returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs('org.couchdb.user:name').returns(true);
      authorization.isAuthChange.withArgs('org.couchdb.user:name').returns(true);
      let initialFeed;

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          initialFeed = controller._getNormalFeeds()[0];
          initialFeed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
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
          feed.allowedDocIds.should.deep.equal([ 'a', 'b', 'c' ]);
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
            .upstreamRequest.complete(null, { results: [], last_seq: 2 });
        })
        .then(nextTick)
        .then(() => {
          const feed = controller._getLongpollFeeds()[0];
          const emitter = controller._getContinuousFeed();
          authorization.allowedDoc.withArgs(3)
            .onCall(0).returns(false)
            .onCall(1).returns(false)
            .onCall(2).returns(false);
          authorization.allowedDoc.withArgs(2)
            .onCall(0).returns(false)
            .onCall(1).returns(false)
            .onCall(2).returns({ newSubjects: 0 });
          authorization.allowedDoc.withArgs(4)
            .onCall(0).returns(false)
            .onCall(1).returns({ newSubjects: 2 });
          authorization.allowedDoc.withArgs(1)
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
      authorization.allowedDoc.withArgs('report-3')
        .onCall(0).returns(false)
        .onCall(1).returns(true);
      authorization.allowedDoc.withArgs('report-2')
        .onCall(0).returns(false)
        .onCall(1).returns(false)
        .onCall(2).returns(false);
      authorization.allowedDoc.withArgs('report-1')
        .onCall(0).returns(false)
        .onCall(1).returns(true);
      authorization.allowedDoc.withArgs('contact-1').returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs('contact-2').returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', { id: 'report-3', changes: [], doc: { _id: 'report-3'}}, 0, 1);
          emitter.emit('change', { id: 'report-2', changes: [], doc: { _id: 'report-2'}}, 0, 2);
          controller
            ._getNormalFeeds()[0]
            .upstreamRequest.complete(null, { results: [], last_seq: 2 });
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

          authorization.allowedDoc.withArgs('report-3').callCount.should.equal(2);
          authorization.allowedDoc.withArgs('report-2').callCount.should.equal(2);
          authorization.allowedDoc.withArgs('report-1').callCount.should.equal(2);
          authorization.allowedDoc.withArgs('contact-1').callCount.should.equal(1);
          authorization.allowedDoc.withArgs('contact-2').callCount.should.equal(2);
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
            .upstreamRequest.complete(null, { results: [], last_seq: 2 });
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
      authorization.allowedDoc.withArgs('report-1').returns(true);
      authorization.allowedDoc.withArgs('report-2').returns(false);
      authorization.allowedDoc.withArgs('report-3').returns(false);
      authorization.allowedDoc.withArgs('report-4').returns(false);
      authorization.allowedDoc.withArgs('contact-1').returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs('contact-2').returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller
            ._getNormalFeeds()[0]
            .upstreamRequest.complete(null, { results: [], last_seq: 2 });
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

          authorization.allowedDoc.withArgs('report-1').callCount.should.equal(1);
          authorization.allowedDoc.withArgs('report-2').callCount.should.equal(1);
          authorization.allowedDoc.withArgs('report-3').callCount.should.equal(1);
          authorization.allowedDoc.withArgs('report-4').callCount.should.equal(1);
          authorization.allowedDoc.withArgs('contact-1').callCount.should.equal(1);
          authorization.allowedDoc.withArgs('contact-2').callCount.should.equal(1);
          authorization.allowedDoc.callCount.should.equal(6);
        });
    });

    it('does not debounce if debouncing is disabled', () => {
      defaultSettings.debounce_interval = false;

      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.allowedDoc.withArgs(3)
        .onCall(0).returns(false)
        .onCall(1).returns(true);
      authorization.allowedDoc.withArgs(4)
        .onCall(0).returns(false)
        .onCall(1).returns(false);

      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs(2).returns(true);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller
            ._getNormalFeeds()[0]
            .upstreamRequest.complete(null, { results: [], last_seq: 2 });
        })
        .then(nextTick)
        .then(() => {
          const feed = controller._getLongpollFeeds()[0];
          const emitter = controller._getContinuousFeed();
          clock.tick(1000);
          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3}}, 0, 1);
          clock.tick(1000);
          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4}}, 0, 2);
          clock.tick(1000);
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1}}, 0, 3);
          feed.results.length.should.equal(2);
          feed.pendingChanges.length.should.equal(1);
          feed.ended.should.equal(true);
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [{ id: 1, changes: [] }, { id: 3, changes: [] }],
            last_seq: 3
          }));
          controller._getLongpollFeeds().length.should.equal(0);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2}}, 0, 4);
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
        });
    });

    it('does not debounce if debouncing is disabled in restart mode', () => {
      defaultSettings.debounce_interval = false;
      defaultSettings.reiterate_changes = false;

      testReq.query = { feed: 'longpoll' };
      authorization.getAllowedDocIds.onCall(0).resolves([2, 3]);
      authorization.getAllowedDocIds.onCall(1).resolves([1, 2, 3]);
      authorization.allowedDoc.withArgs(3)
        .onCall(0).returns(false)
        .onCall(1).returns(true);
      authorization.allowedDoc.withArgs(4)
        .onCall(0).returns(false)
        .onCall(1).returns(false);

      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs(2).returns(true);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller
            ._getNormalFeeds()[0]
            .upstreamRequest.complete(null, { results: [], last_seq: 2 });
        })
        .then(nextTick)
        .then(() => {
          const feed = controller._getLongpollFeeds()[0];
          const emitter = controller._getContinuousFeed();
          clock.tick(1000);
          emitter.emit('change', { id: 3, changes: [], doc: { _id: 3 }}, 0, 1);
          clock.tick(1000);
          emitter.emit('change', { id: 4, changes: [], doc: { _id: 4 }}, 0, 2);
          clock.tick(1000);
          emitter.emit('change', { id: 1, changes: [], doc: { _id: 1 }}, 0, 3);
          controller._getLongpollFeeds().length.should.equal(0);
          feed.results.should.deep.equal([]);
          controller._getNormalFeeds()[0].should.equal(feed);
          authorization.getAllowedDocIds.callCount.should.equal(2);
          emitter.emit('change', { id: 2, changes: [], doc: { _id: 2 }}, 0, 4);
          emitter.emit('change', { id: 11, changes: [], doc: { _id: 11 }}, 0, 5);
        })
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.pendingChanges.should.deep.equal([
            { change: { id: 2, changes: [] }, viewResults: {}},
            { change: { id: 11, changes: [] }, viewResults: {}},
          ]);
          feed.upstreamRequest.complete(null, {
            results: [{ id: 3, changes: [] }, { id: 1, changes: [] }, { id: 2, changes: [] }],
            last_seq: 5
          });
          (!!feed.ended).should.equal(false);
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
        })
        .then(nextTick)
        .then(() => {
          controller._getNormalFeeds().length.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [{ id: 3, changes: [] }, { id: 1, changes: [] }, { id: 2, changes: [] }],
            last_seq: 5
          }));
        });
    });
  });

  describe('handling longpoll feeds in restart mode', () => {
    it('sends results directly if no new subjects are added', () => {
      testReq.query = { feed: 'longpoll' };
      defaultSettings.reiterate_changes = false;
      authorization.getAllowedDocIds.resolves([1, 2, 3]);
      authorization.allowedDoc.withArgs(1).returns(true);
      authorization.allowedDoc.withArgs(2).returns(false);
      authorization.allowedDoc.withArgs(3).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(4).returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          controller._getNormalFeeds().forEach(feed => {
            feed.upstreamRequest.complete(null, { results: [], last_seq: 5 });
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
      defaultSettings.reiterate_changes = false;
      testReq.query = { feed: 'longpoll', since: 'seq' };
      testReq.id = 'myFeed';
      authorization.getUserAuthorizationData.resolves({ subjectIds: ['a', 'b'], contactsByDepthKeys: []});
      authorization.getAllowedDocIds.onCall(0).resolves([ 'a', 'b' ]);
      authorization.getAllowedDocIds.onCall(1).resolves([ 'a', 'b', 'c', 'd' ]);
      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs(2).returns(false);
      authorization.allowedDoc.withArgs(3).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(4).returns(false);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            batch_size: 3,
            doc_ids: ['a', 'b'],
            since: 'seq'
          });
          controller._getNormalFeeds().forEach(feed => {
            feed.upstreamRequest.complete(null, { results: [], last_seq: 5 });
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
          feed.hasNewSubjects.should.equal(false);
          feed.subjectIds = ['a', 'b', 'c'];
        })
        .then(nextTick)
        .then(() => {
          authorization.getUserAuthorizationData.callCount.should.equal(1);
          authorization.getAllowedDocIds.callCount.should.equal(2);

          changesSpy.callCount.should.equal(3);
          changesSpy.args[2][0].should.deep.equal({
            batch_size: 5,
            doc_ids: ['a', 'b', 'c', 'd'],
            since: 'seq'
          });

          controller._getLongpollFeeds().length.should.equal(0);
          const feed = controller._getNormalFeeds()[0];
          feed.id.should.equal(testReq.id);
          feed.allowedDocIds.should.deep.equal([ 'a', 'b', 'c', 'd' ]);
          feed.upstreamRequest.complete(null, { results: [{ id: 3, changes: [{ rev: 1 }] }, { id: 7, changes: [{ rev: 1 }] }], last_seq: 5 });
        })
        .then(nextTick)
        .then(() => {
          controller._getLongpollFeeds().length.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [{ id: 3, changes: [{ rev: 1 }]}, { id: 7, changes: [{ rev: 1 }]}],
            last_seq: 5
          }));
        });
    });
  });

  describe('handling heartbeats', () => {
    it('does not send heartbeat if not defined', () => {
      authorization.getAllowedDocIds.resolves([ 'a',  'b' ]);
      testReq.query = { feed: 'longpoll' };

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          clock.tick(20000);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
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
          feed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
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
          feed.upstreamRequest.complete(null, { results: [], last_seq: 2 });
        })
        .then(nextTick)
        .then(() => {
          clock.tick(400000000);
          testRes.write.callCount.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('cancels upstreamRequest when the timeout is reached', () => {
      authorization.getAllowedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      testReq.query = { timeout: 50000 };
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          clock.tick(50000);
          changesCancelSpy.callCount.should.equal(1);
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
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

    it('saves deleted status currectly', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }], deleted: true },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }] },
        { id: 3, changes: [{ rev: 1 }] }
      ];

      let changeObj = { change: { id: 1, changes: [{ rev: 2}], deleted: true }};
      controller._appendChange(results, changeObj);
      changeObj = { change: { id: 2, changes: [{ rev: 4 }], deleted: true }};
      controller._appendChange(results, changeObj);
      changeObj = { change: { id: 3, changes: [{ rev: 2 }] }};
      controller._appendChange(results, changeObj);

      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }, { rev: 2 }], deleted: true },
        { id: 2, changes: [{ rev: 1 }, { rev: 3 }, { rev: 4 }], deleted: true },
        { id: 3, changes: [{ rev: 1 }, { rev: 2 }] }
      ]);
    });

    it('deep clones the change object', () => {
      const results = [],
            changeObj = { change: { id: 1, changes: [{ rev: 1 }]}, viewResults: {}};

      controller._appendChange(results, changeObj);
      results[0].should.deep.equal(changeObj.change);
      results[0].should.not.equal(changeObj.change);
    });
  });

  describe('processPendingChanges', () => {
    it('filters authorized changes and appends then to the results list', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }] }
      ];
      const pendingChanges = [
        { change: { id: 1, changes: [{ rev: 1 }]}},
        { change: { id: 2, changes: [{ rev: 2 }]}},
        { change: { id: 3, changes: [{ rev: 2 }]}},
        { change: { id: 4, changes: [{ rev: 1 }]}},
        { change: { id: 5, changes: [{ rev: 1 }]}},
      ];
      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(2).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(3).returns(false);
      authorization.allowedDoc.withArgs(4).returns(false);
      authorization.allowedDoc.withArgs(5).returns(true);

      controller._processPendingChanges({ pendingChanges, userCtx, results }, true).should.equal(true);
      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 5, changes: [{ rev: 1 }] }
      ]);
    });

    it('returns correct authChange value when user doc change is received', () => {
      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(2).returns(true);
      authorization.allowedDoc.withArgs(3).returns(false);
      authorization.allowedDoc.withArgs('org.couchdb.user:user').returns(true);
      authorization.allowedDoc.withArgs(5).returns({ newSubjects: 0 });
      authorization.isAuthChange.withArgs('org.couchdb.user:user').returns(true);

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
        { change: { id: 6, changes: [{ rev: 1 }]}},
        { change: { id: 7, changes: [{ rev: 1 }]}},
        { change: { id: 8, changes: [{ rev: 1 }]}},
        { change: { id: 4, changes: [{ rev: 1 }]}},
        { change: { id: 5, changes: [{ rev: 1 }]}},
        { change: { id: 2, changes: [{ rev: 2 }]}},
        { change: { id: 3, changes: [{ rev: 2 }]}},
        { change: { id: 1, changes: [{ rev: 1 }]}}
      ];
      const feed = { pendingChanges: changes, results: [] };
      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 2 });
      authorization.allowedDoc.withArgs(2)
        .onCall(0).returns(false)
        .onCall(1).returns({ newSubjects: 2 });

      authorization.allowedDoc.withArgs(3).returns(false);
      authorization.allowedDoc.withArgs(4)
        .onCall(0).returns(false)
        .onCall(1).returns(false)
        .onCall(2).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(5).returns(false);
      authorization.allowedDoc.withArgs(6).returns(false);
      authorization.allowedDoc.withArgs(7).returns(false);
      authorization.allowedDoc.withArgs(8).returns(false);

      controller._processPendingChanges(feed, true).should.equal(true);

      authorization.allowedDoc.withArgs(1).callCount.should.equal(1);
      authorization.allowedDoc.withArgs(2).callCount.should.equal(2);
      authorization.allowedDoc.withArgs(3).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(4).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(5).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(6).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(7).callCount.should.equal(3);
      authorization.allowedDoc.withArgs(8).callCount.should.equal(3);
      authorization.allowedDoc.callCount.should.equal(21);

      feed.pendingChanges.length.should.equal(5);
      feed.pendingChanges.every(change => [3, 5, 6, 7, 8].indexOf(change.change.id) !== -1).should.equal(true);
    });

    it('does not reiterate when allowed changes do not modify the subjects list', () => {
      const pendingChanges = [
        { change: { id: 4, changes: [{ rev: 1 }]}},
        { change: { id: 5, changes: [{ rev: 1 }]}},
        { change: { id: 2, changes: [{ rev: 2 }]}},
        { change: { id: 3, changes: [{ rev: 2 }]}},
        { change: { id: 1, changes: [{ rev: 1 }]}}
      ];
      const feed = { pendingChanges, results: [] };
      authorization.allowedDoc.withArgs(1).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(2).returns(false);
      authorization.allowedDoc.withArgs(3).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(4).returns({ newSubjects: 0 });
      authorization.allowedDoc.withArgs(5).returns(false);

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
        { change: { id: 4, changes: [{ rev: 1 }]}},
        { change: { id: 5, changes: [{ rev: 1 }]}},
        { change: { id: 2, changes: [{ rev: 2 }]}},
        { change: { id: 3, changes: [{ rev: 2 }]}},
        { change: { id: 1, changes: [{ rev: 1 }]}}
      ];

      controller._processPendingChanges({ pendingChanges, hasNewSubjects: true }).should.equal(true);
      authorization.isAuthChange.callCount.should.equal(0);
      authorization.allowedDoc.callCount.should.equal(5);
    });
  });

  describe('generateTombstones', () => {

    it('converts tombstone changes to their original document counterparts', () => {
      const results = [{ id: '1-tombstone' }, { id: 2 }, { id: 3 }, { id: '4-tombstone' }];
      tombstoneUtils.isTombstoneId.withArgs('1-tombstone').returns(true);
      tombstoneUtils.isTombstoneId.withArgs('4-tombstone').returns(true);
      tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '1-tombstone' }).returns({ id: 1 });
      tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '4-tombstone' }).returns({ id: 4 });

      controller._generateTombstones(results);

      results.length.should.equal(4);
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
      const normalFeeds = controller._getNormalFeeds();
      authorization.getViewResults.withArgs({ _id: 1 }).returns({ view1: 'a', view2: 'b' });
      const testFeed = { lastSeq: 0, pendingChanges: [] };
      normalFeeds.push(testFeed);

      controller._processChange({ id: 1, doc: { _id: 1 }}, 1);
      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1 },
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
      tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({id: '1-tombstone'});

      authorization.getViewResults.callCount.should.equal(1);
      authorization.getViewResults.args[0][0].should.deep.equal({ _id: '1-tombstone' });

      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1, changes: [{ rev: 2 }] },
        viewResults: { view1: 'a', view2: 'b' }
      });
    });

    it('pushes the change to the results of longpoll feeds, if allowed, otherwise only updates seq', () => {
      authorization.getViewResults.withArgs(sinon.match({ _id: 1 })).returns({ view1: 'a', view2: 'b' });
      authorization.allowedDoc.withArgs(1, sinon.match({ id: 'feed1' })).returns(true);
      authorization.allowedDoc.withArgs(1, sinon.match({ id: 'feed2' })).returns(false);
      authorization.allowedDoc.withArgs(1, sinon.match({ id: 'feed3' })).returns(true);

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

    it('deletes change doc after view maps are applied to it, to save up memory', () => {
      authorization.getViewResults.withArgs(sinon.match({ _id: 1 })).returns({ view1: 'a', view2: 'b' });
      authorization.allowedDoc.withArgs(1, sinon.match({ id: 'feed1' })).returns(true);
      authorization.allowedDoc.withArgs(1, sinon.match({ id: 'feed2' })).returns(false);
      authorization.allowedDoc.withArgs(1, sinon.match({ id: 'feed3' })).returns(true);

      const change = {
        id: 1,
        changes: [{ rev: 1 }],
        doc: {
          _id: 1,
          someValue: 1
        }
      };

      const longpollFeeds = controller._getLongpollFeeds();
      const testFeed1 = { id: 'feed1', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [], reiterate_changes: true };
      const testFeed2 = { id: 'feed2', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [], reiterate_changes: true };
      const testFeed3 = { id: 'feed3', lastSeq: 0, results: [], req: testReq, res: testRes, pendingChanges: [], reiterate_changes: true };
      longpollFeeds.push(testFeed1, testFeed2, testFeed3);
      controller._processChange(change, 'seq');
      testFeed1.results[0].should.deep.equal(change);
      testFeed3.results[0].should.deep.equal(change);
      testFeed2.pendingChanges[0].should.deep.equal({ change, viewResults: { view1: 'a', view2: 'b' }});
      (!!change.doc).should.equal(false);
    });
  });

  describe('writeDownstream', () => {
    it('does not attempt to write if response is finished', () => {
      testRes.finished = true;
      const feed = { res: testRes };
      controller._writeDownstream(feed, 'aaa');
      testRes.write.callCount.should.equal(0);
      testRes.end.callCount.should.equal(0);
      testRes.status.callCount.should.equal(0);
    });

    it('does not end response if not specified', () => {
      const feed = { res: testRes };
      controller._writeDownstream(feed, 'aaa');
      controller._writeDownstream(feed, 'bbb', false);

      testRes.write.callCount.should.equal(2);
      testRes.write.args.should.deep.equal([ ['aaa'], ['bbb'] ]);
      testRes.end.callCount.should.equal(0);
      testRes.status.callCount.should.equal(0);
    });

    it('ends the feed, if specified', () => {
      const feed = { res: testRes };

      controller._writeDownstream(feed, 'aaa', true);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0][0].should.equal('aaa');
      testRes.end.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
    });

    it('calls `res.flush` after writing - necessary for compression and heartbeats', () => {
      controller._writeDownstream({ res: testRes }, 'aaa', true);
      testRes.write.callCount.should.equal(1);
      testRes.flush.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
    });

    it('sets response status to 500 when feed has errors', () => {
      controller._writeDownstream({ res: testRes, error: true }, 'aaa', true);
      testRes.status.callCount.should.equal(1);
      testRes.status.args[0].should.deep.equal([ 500 ]);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0].should.deep.equal([ 'aaa' ]);
    });

    it('does not set response status to 500 when feed has errors and headers are already sent', () => {
      testRes.headersSent = true;
      controller._writeDownstream({ res: testRes, error: true }, 'aaa', true);
      testRes.status.callCount.should.equal(0);
      testRes.write.callCount.should.equal(1);
      testRes.write.args[0].should.deep.equal([ 'aaa' ]);
    });
  });

  describe('split', () => {
    it('splits as expected', () => {
      controller._split([1, 2, 3, 4, 5, 6], 3).should.deep.equal([[1, 2, 3], [4, 5, 6]]);
      controller._split([1, 2, 3, 4], 3).should.deep.equal([[1, 2, 3], [4]]);
      controller._split([1, 2, 3, 4], 1).should.deep.equal([[1], [2], [3], [4]]);
      controller._split([1, 2, 3, 4], 0).should.deep.equal([[1, 2, 3, 4]]);

      const array = Array.from({length: 40}, () => Math.floor(Math.random() * 40)),
            arrayCopy = [...array];
      const result = controller._split(array, 10);
      result.length.should.equal(4);
      _.flatten(result).should.deep.equal(arrayCopy);
    });

    it('does not crash with invalid count argument', () => {
      controller._split([1, 2, 3]).should.deep.equal([[1, 2, 3]]);
      controller._split([1, 2, 3], null).should.deep.equal([[1, 2, 3]]);
      controller._split([1, 2, 3], undefined).should.deep.equal([[1, 2, 3]]);
      controller._split([1, 2, 3], false).should.deep.equal([[1, 2, 3]]);
      controller._split([1, 2, 3], true).should.deep.equal([[1, 2, 3]]);
      controller._split([1, 2, 3], 'onehundred').should.deep.equal([[1, 2, 3]]);
    });
  });

  describe('generateResponse', () => {
    it('returns obj with feed results and last seq when no error', () => {
      const feed = { results: 'results', lastSeq: 'lastSeq' };
      controller._generateResponse(feed).should.deep.equal({
        results: feed.results,
        last_seq: feed.lastSeq
      });
    });

    it('returns error message when error exists', () => {
      const feed = { results: 'results', lastSeq: 'lastSeq', error: true };
      controller._generateResponse(feed).should.deep.equal({ error: 'Error processing your changes' });
    });
  });
});
