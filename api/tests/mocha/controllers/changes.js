const sinon = require('sinon').sandbox.create(),
      auth = require('../../../src/auth'),
      controller = require('../../../src/controllers/changes'),
      authorization = require('../../../src/services/authorization'),
      db = require('../../../src/db-pouch'),
      config = require('../../../src/config'),
      inherits = require('util').inherits,
      EventEmitter = require('events');

require('chai').should();
let testReq,
    testRes,
    userCtx,
    ChangesEmitter,
    changesSpy,
    changesCancelSpy,
    clock,
    emitters,
    proxy;

const nextTick = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

describe('Changes controller', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    emitters = [];
    testReq = { on: sinon.stub() };
    testRes = { type: sinon.stub(), write: sinon.stub(), end: sinon.stub(), setHeader: sinon.stub() };
    userCtx = { name: 'user', facility_id: 'facility', contact_id: 'contact' };
    proxy = { web: sinon.stub() };

    changesSpy = sinon.spy();
    changesCancelSpy = sinon.spy();
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'user' });
    sinon.stub(auth, 'isAdmin').returns(false);
    sinon.stub(auth, 'hydrate').resolves(userCtx);
    sinon.stub(config, 'get').returns(false);
    sinon.stub(controller._tombstoneUtils, 'isTombstoneId').returns(false);
    sinon.stub(controller._tombstoneUtils, 'generateChangeFromTombstone');
    sinon.stub(controller._tombstoneUtils, 'extractDoc');
    sinon.stub(authorization, 'getViewResults').returns({});
    sinon.stub(authorization, 'allowedChange');
    sinon.stub(authorization, 'getDepth').returns(1);
    sinon.stub(authorization, 'getSubjectIds').resolves({});
    sinon.stub(authorization, 'getValidatedDocIds').resolves({});
    sinon.stub(controller._, 'now').callsFake(Date.now); // force underscore's debounce to use fake timers!

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

    db.medic = { changes: changes, setMaxListeners: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
    controller._reset();
    emitters.forEach(emitter => emitter.cancel());
  });

  describe('init', () => {
    it('initializes the continuous changes feed and used constants', () => {
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
      db.medic.setMaxListeners.callCount.should.equal(1);
      config.get.callCount.should.equal(1);
      config.get.args[0][0].should.equal('changes_doc_ids_optimization_threshold');
    });

    it('sends changes to be analyzed and updates current seq when changes come in', () => {
      controller._tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
      controller._init();
      const emitter = controller._getContinuousFeed();
      emitter.emit('change', { id: 'change' }, 0, 'newseq');
      controller._tombstoneUtils.isTombstoneId.callCount.should.equal(1);
      controller._tombstoneUtils.isTombstoneId.args[0][0].should.equal('change');
      controller._getCurrentSeq().should.equal('newseq');
    });

    it('resets changes listener on error, using last received sequence', () => {
      controller._tombstoneUtils.isTombstoneId.withArgs('change').returns(false);
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
          auth.hydrate.callCount.should.equal(0);
          testRes.setHeader.callCount.should.equal(0);
        });
    });

    it('pushes non-admin requests to the normal feeds list', () => {
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          proxy.web.callCount.should.equal(0);
          testReq.on.callCount.should.equal(1);
          testReq.on.args[0][0].should.equal('close');
          testRes.type.callCount.should.equal(1);
          testRes.type.args[0][0].should.equal('json');
          auth.hydrate.callCount.should.equal(1);
          const feeds = controller._getNormalFeeds();
          feeds.length.should.equal(1);
          testRes.setHeader.callCount.should.equal(0);
        });
    });

    it('sets correct headers when longpoll requests are received', () => {
      auth.isAdmin.returns(true);
      testReq.query = { feed: 'longpoll' };
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          testRes.setHeader.callCount.should.equal(1);
          testRes.setHeader.args[0].should.deep.equal(['X-Accel-Buffering', 'no']);
        });
    });
  });

  describe('initFeed', () => {
    it('initializes feed with default values', () => {
      controller._init();
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
          feed.upstreamRequests.length.should.equal(0);
          feed.limit.should.equal(100);
          feed.should.not.have.property('heartbeat');
          feed.timeout.should.be.an('Object');
          clock.tick(60000);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.deep.equal(JSON.stringify({ results: [], last_seq: 'seq-1' }));
          testRes.end.callCount.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('initializes the feed with custom values', () => {
      testReq.query = { limit: 23, heartbeat: 10000, since: 'some-since-655' };
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.limit.should.equal(23);
          feed.heartbeat.should.be.an('Object');
          clock.tick(80000);
          testRes.write.callCount.should.equal(7);
          testRes.write.args.should.deep.equal([
            ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], ['\n'], //heartbeats
            [ JSON.stringify({ results: [], last_seq: 'some-since-655' }) ]
          ]);
          testRes.end.callCount.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('requests user authorization information with correct userCtx', () => {
      const subjectIds = ['s1', 's2', 's3'];
      const validatedDocIds = ['d1', 'd2', 'd3'];
      authorization.getSubjectIds.resolves(subjectIds);
      authorization.getValidatedDocIds.resolves(validatedDocIds);
      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          authorization.getSubjectIds.callCount.should.equal(1);
          authorization.getSubjectIds.args[0][0].should.deep.equal(userCtx);
          authorization.getValidatedDocIds.callCount.should.equal(1);
          authorization.getValidatedDocIds.args[0][1].should.deep.equal(userCtx);
          return Promise.resolve();
        })
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.validatedIds.should.deep.equal(validatedDocIds);
          feed.subjectIds.should.deep.equal(subjectIds);
        });
    });
  });

  describe('getChanges', () => {
    it('requests changes with correct default parameters', () => {
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(40);
      const validatedDocIds = ['d1', 'd2', 'd3'];
      authorization.getValidatedDocIds.resolves(validatedDocIds);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          authorization.getValidatedDocIds.callCount.should.equal(1);
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: 0,
            limit: 40,
            doc_ids: validatedDocIds
          });
        });
    });

    it('requests changes with correct query parameters', () => {
      testReq.query = { limit: 20, view: 'test', something: 'else', conflicts: true, seq_interval: false, since: '22'};
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(40);
      const validatedDocIds = ['d1', 'd2', 'd3'];
      authorization.getValidatedDocIds.resolves(validatedDocIds);
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(2);
          changesSpy.args[1][0].should.deep.equal({
            since: '22',
            limit: 40,
            doc_ids: validatedDocIds,
            conflicts: true,
            seq_interval: false
          });
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.length.should.equal(1);
        });
    });

    it('splits validated docIds into correct sized chunks', () => {
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getValidatedDocIds.resolves(validatedIds);

      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          changesSpy.callCount.should.equal(5);
          let resultIds = [];
          changesSpy.args.forEach((arg, idx) => {
            if (idx === 0) {
              return;
            }

            arg[0].doc_ids.length.should.equal(10);
            resultIds.push.apply(resultIds, arg[0].doc_ids);
          });
          resultIds.should.deep.equal(validatedIds);
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.length.should.equal(4);
        });
    });

    it('cancels all upstream requests and restarts them when one of them fails', () => {
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getValidatedDocIds.resolves(validatedIds);

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
          resultIds.should.deep.equal(validatedIds.concat(validatedIds));
        });
    });

    it('sends empty response when any of the change feeds are canceled', () => {
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getValidatedDocIds.resolves(validatedIds);
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
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getValidatedDocIds.resolves(validatedIds);
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
      authorization.getValidatedDocIds.resolves(validatedIds);
      authorization.allowedChange.withArgs(sinon.match.any, { change: { id: 7, changes: [] }, viewResults: {} }).returns(false);
      authorization.allowedChange.withArgs(sinon.match.any, { change: { id: 8, changes: [] }, viewResults: {} }).returns(true);
      authorization.allowedChange.withArgs(sinon.match.any, { change: { id: 9, changes: [] }, viewResults: {} }).returns(true);
      testReq.query = { since: 0 };

      return controller
        .request(proxy, testReq, testRes)
        .then(() => {
          controller._getContinuousFeed().emit('change', { id: 7, changes: [] }, 0, 4);
          return Promise.resolve();
        })
        .then(() => {
          controller._getContinuousFeed().emit('change', { id: 8, changes: [] }, 0, 5);
          return Promise.resolve();
        })
        .then(() => {
          controller._getContinuousFeed().emit('change', { id: 9, changes: [] }, 0, 6);
          return Promise.resolve();
        })
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests[0].complete(null, { results: [{ id: 1, changes: [] }, { id: 2, changes: [] }, { id: 3, changes: [] }], last_seq: 3 });
          feed.upstreamRequests[1].complete(null, { results: [{ id: 4, changes: [] }, { id: 5, changes: [] }, { id: 6, changes: [] }], last_seq: 6 });
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

    it('when no normal results are received for a non-longpoll, send empty results', () => {
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(10);
      const validatedIds = Array.from({length: 40}, () => Math.floor(Math.random() * 40));
      authorization.getValidatedDocIds.resolves(validatedIds);

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
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: [], last_seq: 0 }));
          testRes.end.callCount.should.equal(1);
          controller._getNormalFeeds().length.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(0);
        });
    });

    it('when no normal results are received for a longpoll request, push to waiting feeds', () => {
      authorization.getValidatedDocIds.resolves([1, 2]);
      testReq.query = { feed: 'longpoll' };
      testReq.uniqId = 'myUniqueId';
      return controller
        .request(proxy, testReq, testRes)
        .then(nextTick)
        .then(() => {
          const feed = controller._getNormalFeeds()[0];
          feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, { results: [], last_seq: 1 }));
        })
        .then(nextTick)
        .then(() => {
          testRes.write.callCount.should.equal(0);
          testRes.end.callCount.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
          controller._getLongpollFeeds().length.should.equal(1);
          const feed = controller._getLongpollFeeds()[0];
          feed.id.should.equal('myUniqueId');
          feed.validatedIds.should.deep.equal([1, 2]);
        });
    });

    it('cancels all upstreamRequests when the timeout is reached', () => {
      authorization.getValidatedDocIds.resolves([1, 2, 3, 4, 5, 6]);
      config.get.withArgs('changes_doc_ids_optimization_threshold').returns(2);
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
  });

  describe('handling waiting feeds', () => {
    it('pushes allowed live changes to the feed results', () => {
      authorization.getValidatedDocIds.resolves(['a', 'b']);
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
          feed.validatedIds.should.deep.equal([ 'a', 'b' ]);
          feed.results.length.should.equal(0);

          authorization.allowedChange.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          feed.limit.should.equal(99);
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          feed.limit.should.equal(98);
          authorization.allowedChange.returns(false);
          emitter.emit('change', { id: 3, changes: [] }, 0, 3);
          authorization.allowedChange.returns(true);
          emitter.emit('change', { id: 4, changes: [] }, 0, 4);
          feed.limit.should.equal(97);
          feed.results.length.should.equal(3);
          feed.results.should.deep.equal([ { id: 1, changes: [] }, { id: 2, changes: [] }, { id: 4, changes: [] } ]);
          feed.lastSeq.should.equal(4);
          controller._getLongpollFeeds().length.should.equal(1);
        });
    });

    it('debounces ending the feed, capturing rapidly received changes, resets feed timeout every time', () => {
      authorization.getValidatedDocIds.resolves([ 'a', 'b']);
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
          let feedTimout = feed.timeout;
          feed.validatedIds.should.deep.equal([ 'a', 'b' ]);
          feed.results.length.should.equal(0);

          authorization.allowedChange.returns(true);
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
      authorization.getValidatedDocIds.resolves([ 'a',  'b']);
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

          authorization.allowedChange.returns(true);
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

    it('sends empty result on timeout when no allowed changes are received, returning last seq', () => {
      authorization.getValidatedDocIds.resolves([ 'a',  'b']);
      testReq.query = { limit: 4, feed: 'longpoll', timeout: 60000, since: 2 };

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

    it('debounces correctly for multiple concurrent longpoll feeds', () => {
      authorization.getValidatedDocIds.onCall(0).resolves([ 'a', 'b' ]);
      authorization.getValidatedDocIds.onCall(1).resolves([ 1, 2 ]);
      authorization.getValidatedDocIds.onCall(2).resolves([ '*', '-' ]);
      authorization.allowedChange
        .withArgs(sinon.match({ id: 'one' }), sinon.match({ change: { id: sinon.match(/^[a-z]+$/) } }))
        .returns(true);
      authorization.allowedChange
        .withArgs(sinon.match({ id: 'two' }), sinon.match({ change: { id: sinon.match(/^[0-9]+$/) } }))
        .returns(true);

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
            feed.upstreamRequests.forEach(upstreamRequest => upstreamRequest.complete(null, {
              results: [],
              last_seq: 2
            }));
          });
          controller._getLongpollFeeds().length.should.equal(0);
        })
        .then(nextTick)
        .then(() => {
          controller._getNormalFeeds().length.should.equal(0);
          const emitter = controller._getContinuousFeed();
          emitter.emit('change', { id: 'a', changes: [] }, 0, 1);
          clock.tick(100);
          emitter.emit('change', { id: '1', changes: [] }, 0, 2);
          emitter.emit('change', { id: 'b', changes: [] }, 0, 3);
          clock.tick(100);
          controller._getLongpollFeeds().length.should.equal(3);
          emitter.emit('change', { id: '2', changes: [] }, 0, 4);
          emitter.emit('change', { id: '----', changes: [] }, 0, 5);
          clock.tick(100);

          // feed 'one' should end at this point
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({
            results: [ { id: 'a',  changes: [] }, { id: 'b',  changes: [] } ], last_seq: 5
          }));
          controller._getLongpollFeeds().length.should.equal(2);

          emitter.emit('change', { id: '++++',  changes: []}, 0, 6);
          emitter.emit('change', { id: '2', changes: [] }, 0, 7);
          clock.tick(100);
          emitter.emit('change', { id: '++++',  changes: []}, 0, 8);
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
  });

  describe('handling heartbeats', () => {
    it('does not send heartbeat if not defined', () => {
      authorization.getValidatedDocIds.resolves([ 'a',  'b']);
      testReq.query = { limit: 4, feed: 'longpoll', timeout: 60000 };

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
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify({ results: [], last_seq: 2 }));
          controller._getLongpollFeeds().length.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
        });
    });

    it('does send heartbeat during the whole execution, while normal and longpoll', () => {
      authorization.getValidatedDocIds.resolves([ 'a',  'b']);
      testReq.query = { limit: 4, feed: 'longpoll', timeout: 60000, heartbeat: 5000 };

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
          testRes.end.callCount.should.equal(1);
          testRes.write.callCount.should.equal(13);
          for (let i = 0; i < 12 ; i++) {
            testRes.write.args[i][0].should.equal('\n');
          }
          testRes.write.args[12][0].should.equal(JSON.stringify({ results: [], last_seq: 2 }));
          controller._getLongpollFeeds().length.should.equal(0);
          controller._getNormalFeeds().length.should.equal(0);
          clock.tick(10000);
          testRes.write.callCount.should.equal(13);
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
  });

  describe('processPendingChanges', () => {
    it('filters authorized changes and appends then to the results list', () => {
      const results = [
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }] }
      ];
      const changes = [
        { change: { id: 1, changes: [{ rev: 1 }] } },
        { change: { id: 2, changes: [{ rev: 2 }] } },
        { change: { id: 3, changes: [{ rev: 2 }] } },
        { change: { id: 4, changes: [{ rev: 1 }] } },
        { change: { id: 5, changes: [{ rev: 1 }] } },
      ];
      authorization.allowedChange.withArgs(sinon.match.any, sinon.match({ change: { id: 1 } })).returns(true);
      authorization.allowedChange.withArgs(sinon.match.any, sinon.match({ change: { id: 2 } })).returns(true);
      authorization.allowedChange.withArgs(sinon.match.any, sinon.match({ change: { id: 3 } })).returns(false);
      authorization.allowedChange.withArgs(sinon.match.any, sinon.match({ change: { id: 4 } })).returns(false);
      authorization.allowedChange.withArgs(sinon.match.any, sinon.match({ change: { id: 5 } })).returns(true);

      controller._processPendingChanges({ pendingChanges: changes }, results);
      results.length.should.equal(3);
      results.should.deep.equal([
        { id: 1, changes: [{ rev: 1 }] },
        { id: 2, changes: [{ rev: 1 }, { rev: 2 }] },
        { id: 5, changes: [{ rev: 1 }] }
      ]);
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
      controller._tombstoneUtils.isTombstoneId.withArgs('1-tombstone').returns(true);
      controller._tombstoneUtils.isTombstoneId.withArgs('4-tombstone').returns(true);
      controller._tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '1-tombstone' }).returns({ id: 1 });
      controller._tombstoneUtils.generateChangeFromTombstone.withArgs({ id: '4-tombstone' }).returns({ id: 4 });

      const actual = controller._mergeResults(responses);
      actual.length.should.equal(4);
      actual.should.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
      controller._tombstoneUtils.isTombstoneId.callCount.should.equal(4);
      controller._tombstoneUtils.isTombstoneId.args.should.deep.equal([ ['1-tombstone'], [2], [3], ['4-tombstone'] ]);
      controller._tombstoneUtils.generateChangeFromTombstone.callCount.should.equal(2);
      controller._tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({ id: '1-tombstone' });
      controller._tombstoneUtils.generateChangeFromTombstone.args[1][0].should.deep.equal({ id: '4-tombstone' });
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
      const longpollFeed = { lastSeq: 0, results: [], req: testReq, res: testRes };
      normalFeeds.push(normalFeed);
      longpollFeeds.push(longpollFeed);

      controller._processChange({ id: 1, doc: { _id: 1 }}, 'seq');
      normalFeed.lastSeq.should.equal('seq');
      longpollFeed.lastSeq.should.equal('seq');
    });

    it('if tombstone change is detected, change content is converted to reflect deleted counterpart', () => {
      const normalFeeds = controller._getNormalFeeds();
      const testFeed = { lastSeq: 0, pendingChanges: [], req: testReq, res: testRes};
      authorization.getViewResults.withArgs({ _id: 1 }).returns({ view1: 'a', view2: 'b' });

      normalFeeds.push(testFeed);
      controller._tombstoneUtils.isTombstoneId.returns(true);
      controller._tombstoneUtils.generateChangeFromTombstone.returns({ id: 1, changes: [{ rev: 2 }] });
      controller._tombstoneUtils.extractDoc.returns({ _id: 1 });

      controller._processChange({ id: '1-tombstone', doc: { _id: '1-tombstone' }}, 'seq');

      controller._tombstoneUtils.isTombstoneId.callCount.should.equal(1);
      controller._tombstoneUtils.isTombstoneId.args[0][0].should.equal('1-tombstone');
      controller._tombstoneUtils.generateChangeFromTombstone.callCount.should.equal(1);
      controller._tombstoneUtils.generateChangeFromTombstone.args[0][0].should.deep.equal({
        id: '1-tombstone',
        doc: { _id: '1-tombstone' }
      });
      controller._tombstoneUtils.extractDoc.callCount.should.equal(1);
      controller._tombstoneUtils.extractDoc.args[0][0].should.deep.equal({ _id: '1-tombstone' });
      authorization.getViewResults.callCount.should.equal(1);
      authorization.getViewResults.args[0][0].should.deep.equal({ _id: 1 });

      testFeed.pendingChanges.length.should.equal(1);
      testFeed.pendingChanges[0].should.deep.equal({
        change: { id: 1, changes: [{ rev: 2 }] },
        viewResults: { view1: 'a', view2: 'b' }
      });
    });

    it('pushes the change to the results of longpoll feeds, if allowed, otherwise only updates seq', () => {
      authorization.getViewResults.withArgs({ _id: 1 }).returns({ view1: 'a', view2: 'b' });
      authorization.allowedChange.withArgs(sinon.match({ id: 1 })).returns(true);
      authorization.allowedChange.withArgs(sinon.match({ id: 2 })).returns(false);
      authorization.allowedChange.withArgs(sinon.match({ id: 3 })).returns(true);

      const longpollFeeds = controller._getLongpollFeeds();
      const testFeed1 = { id: 1, lastSeq: 0, results: [], req: testReq, res: testRes };
      const testFeed2 = { id: 2, lastSeq: 0, results: [], req: testReq, res: testRes };
      const testFeed3 = { id: 3, lastSeq: 0, results: [], req: testReq, res: testRes };
      longpollFeeds.push(testFeed1, testFeed2, testFeed3);

      controller._processChange({ id: 1, doc: { _id: 1 }}, 'seq');
      testFeed1.lastSeq.should.equal('seq');
      testFeed2.lastSeq.should.equal('seq');
      testFeed3.lastSeq.should.equal('seq');

      testFeed1.results.length.should.equal(1);
      testFeed2.results.length.should.equal(0);
      testFeed3.results.length.should.equal(1);

      testFeed1.results[0].should.deep.equal({ id: 1, doc: { _id: 1 }});
      testFeed3.results[0].should.deep.equal({ id: 1, doc: { _id: 1 }});
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
