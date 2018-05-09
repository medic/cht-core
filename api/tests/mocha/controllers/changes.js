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
    Changes,
    changesSpy,
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
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'user' });
    sinon.stub(auth, 'isAdmin').returns(false);
    sinon.stub(auth, 'hydrate').resolves(userCtx);
    sinon.stub(config, 'get').returns(false);
    sinon.stub(controller._tombstoneUtils, 'isTombstoneId');
    sinon.stub(controller._tombstoneUtils, 'generateChangeFromTombstone');
    sinon.stub(authorization, 'getViewResults').returns({});
    sinon.stub(authorization, 'isAllowedFeed');
    sinon.stub(authorization, 'getDepth').returns(1);
    sinon.stub(authorization, 'getSubjectIds').resolves({});
    sinon.stub(authorization, 'getValidatedDocIds').resolves({});
    sinon.stub(controller._, 'now').returns(Date.now); // force underscore debounce to use fake timers!

    Changes = function(opts) {
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
        self.emit('cancel');
        complete(null, { status: 'cancelled' });
      };
      this.complete = complete;

      this.then = promise.then.bind(promise);
      this['catch'] = promise['catch'].bind(promise);
      this.then(result => complete(null, result), complete);
    };
    inherits(Changes, EventEmitter);
    const changes = (opts) => {
      const emitter = new Changes(opts);
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
    it('initializes the continuous changes feed', () => {
      controller._init();
      changesSpy.callCount.should.equal(1);
      changesSpy.args[0][0].should.deep.equal({
        live: true,
        include_docs: true,
        since: 'now',
        timeout: false,
      });
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
          feed.acceptLimit.should.equal(100);
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
          feed.acceptLimit.should.equal(23);
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
      authorization.isAllowedFeed.withArgs(sinon.match.any, { change: { id: 7, changes: [] }, authData: {} }).returns(false);
      authorization.isAllowedFeed.withArgs(sinon.match.any, { change: { id: 8, changes: [] }, authData: {} }).returns(true);
      authorization.isAllowedFeed.withArgs(sinon.match.any, { change: { id: 9, changes: [] }, authData: {} }).returns(true);
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
  });

  describe('handling waiting feeds', () => {
    it('pushes allowed live changes to the feed results', () => {
      authorization.getValidatedDocIds.resolves([1, 2]);
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
          feed.validatedIds.should.deep.equal([1, 2]);
          feed.results.length.should.equal(0);

          authorization.isAllowedFeed.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          authorization.isAllowedFeed.returns(false);
          emitter.emit('change', { id: 3, changes: [] }, 0, 3);
          authorization.isAllowedFeed.returns(true);
          emitter.emit('change', { id: 4, changes: [] }, 0, 4);
          feed.results.length.should.equal(3);
          feed.results.should.deep.equal([ { id: 1, changes: [] }, { id: 2, changes: [] }, { id: 4, changes: [] } ]);
          feed.lastSeq.should.equal(4);
          controller._getLongpollFeeds().length.should.equal(1);
        });
    });

    it('debounces sending the results, capturing rapidly received changes, resets feed timeout every time', () => {
      authorization.getValidatedDocIds.resolves([1, 2]);
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
          let timeoutID = feed.timeout.id;
          feed.validatedIds.should.deep.equal([1, 2]);
          feed.results.length.should.equal(0);

          authorization.isAllowedFeed.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          feed.timeout.id.should.not.equal(timeoutID);
          timeoutID = feed.timeout.id;
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          feed.timeout.id.should.not.equal(timeoutID);
          timeoutID = feed.timeout.id;
          emitter.emit('change', { id: 4, changes: [] }, 0, 4);
          feed.timeout.id.should.not.equal(timeoutID);
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

    it('sends results when reaching limit of maximum changes', () => {
      authorization.getValidatedDocIds.resolves([1, 2]);
      testReq.query = { limit: 4, feed: 'longpoll' };
      testReq.uniqId = 'myTestFeed';

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

          authorization.isAllowedFeed.returns(true);
          emitter.emit('change', { id: 1, changes: [] }, 0, 1);
          testRes.end.callCount.should.equal(0);
          emitter.emit('change', { id: 2, changes: [] }, 0, 2);
          testRes.end.callCount.should.equal(0);
          emitter.emit('change', { id: 2, changes: [] }, 0, 3);
          testRes.end.callCount.should.equal(0);
          emitter.emit('change', { id: 3, changes: [] }, 0, 4);
          testRes.end.callCount.should.equal(1);

          emitter.emit('change', { id: 4, changes: [] }, 0, 5);
          feed.results.length.should.equal(3);
          feed.results.should.deep.equal([ { id: 1, changes: [] }, { id: 2, changes: [] },{ id: 3, changes: [] } ]);
          testRes.write.callCount.should.equal(1);
          testRes.write.args[0][0].should.equal(JSON.stringify(
            { results: [ { id: 1, changes: [] }, { id: 2, changes: [] },{ id: 3, changes: [] } ], last_seq: 4 }
          ));
        });
    });


  });
});
