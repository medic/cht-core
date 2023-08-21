describe('Changes service', function() {

  'use strict';

  let service;
  let changesCalls;
  let log;
  let dispatch;
  let getLastChangedDoc;
  let session;

  const onProvider = function(db) {
    return {
      on: function(type, callback) {
        db.callbacks[type] = callback;
        return onProvider(db);
      }
    };
  };

  beforeEach(function (done) {
    changesCalls = {
      medic: { callCount: 0, callOptions: null, callbacks: {} },
      meta: { callCount: 0, callOptions: null, callbacks: {} }
    };

    log = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    };

    session = { isOnlineOnly: sinon.stub(), userCtx: sinon.stub().returns({ name: 'user' }) };

    module('adminApp');
    KarmaUtils.setupMockStore();
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', function() {
        return function(dbOptions) {
          return {
            changes: function(changesOptions) {
              const db = changesCalls[dbOptions.meta ? 'meta' : 'medic'];
              db.callOptions = changesOptions;
              db.callCount++;
              return onProvider(db);
            },
            info: function() {
              return Promise.resolve({
                update_seq: 'test'
              });
            }
          };
        };
      });
      $provide.value('Session', session);
      $provide.value('$timeout', function(fn) {
        return fn();
      });
      $provide.value('$log', log);
    });
    inject(function(_Changes_, $ngRedux, ServicesActions, Selectors) {
      service = _Changes_;
      dispatch = ServicesActions($ngRedux.dispatch);
      getLastChangedDoc = () => Selectors.getLastChangedDoc($ngRedux.getState());
      service()
        .then(done)
        .catch(err => done(err));
    });
  });

  it('calls the callback', function(done) {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('calls the callback for the meta db too', function(done) {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service({
      key: 'test',
      metaDb: true,
      filter: function() {
        return true;
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.meta.callbacks.change(expected);
  });

  it('calls the most recent callback only', function(done) {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function() {
        chai.expect(false).to.equal(true);
      }
    });

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('calls all registered callbacks', function(done) {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };
    const results = { key1: [], key2: [] };

    service({
      key: 'key1',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        results.key1.push(actual);
      }
    });

    service({
      key: 'key2',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        results.key2.push(actual);
      }
    });

    changesCalls.medic.callbacks.change(expected);

    chai.expect(results.key1.length).to.equal(1);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key1[0]).to.equal(expected);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCalls.medic.callCount).to.equal(1);
    chai.expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('calls the callback if filter passes', function(done) {
    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };
    const results = { key1: [], key2: [] };

    service({
      key: 'key1',
      filter: function() {
        return false;
      },
      callback: function(actual) {
        results.key1.push(actual);
      }
    });

    service({
      key: 'key2',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        results.key2.push(actual);
      }
    });

    changesCalls.medic.callbacks.change(expected);

    chai.expect(results.key1.length).to.equal(0);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCalls.medic.callCount).to.equal(1);
    chai.expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('removes the listener when unsubscribe called', function(done) {
    // register callback
    const listener = service({
      key: 'yek',
      callback: function() {
        throw new Error('Callback should have been deregistered');
      }
    });

    // unsubscribe callback
    listener.unsubscribe();

    changesCalls.medic.callbacks.change({ id: 'x', changes: [ { rev: '2-abc' } ] });

    chai.expect(log.error.callCount).to.equal(0);
    chai.expect(changesCalls.medic.callCount).to.equal(1);
    chai.expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('reregisters the callback next time', function(done) {
    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    // register callback
    const listener = service({
      key: 'yek',
      callback: function() {
        throw new Error('Callback should have been deregistered');
      }
    });

    // unsubscribe callback
    listener.unsubscribe();

    // re-subscribe callback
    service({
      key: 'yek',
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('re-attaches where it left off if it loses connection', function(done) {
    const first = { seq: '2-XYZ', id: 'x', changes: [ { rev: '2-abc' } ] };
    const second = { seq: '3-ZYX', id: 'y', changes: [ { rev: '1-abc' } ] };

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function() {
        if (changesCalls.medic.callCount === 1) {
          chai.expect(changesCalls.medic.callOptions.since).to.equal('test');
        }
        if (changesCalls.medic.callCount === 2) {
          chai.expect(changesCalls.medic.callOptions.since).to.equal('2-XYZ');
          done();
        }
      }
    });

    changesCalls.medic.callbacks.change(first);
    changesCalls.medic.callbacks.error(new Error('Test error'));
    changesCalls.medic.callbacks.change(second);
  });

  it('hydrates the change with a doc when it matches the last update when include_docs = false', done => {
    const changes = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' }
    ];
    const docs = [{ _id: '2', data: 1 }, { _id: '5', data: 2 }];
    let calls = 0;
    service({
      key: 'test',
      filter: () => true,
      callback: change => {
        calls++;
        switch (change.id) {
        case '1':
          chai.expect(change.doc).to.equal(undefined);
          chai.expect(getLastChangedDoc()._id).to.equal('2');
          break;
        case '2':
          chai.expect(change.doc._id).to.equal('2');
          chai.expect(change.doc.data).to.equal(1);
          chai.expect(getLastChangedDoc()).to.equal(false);
          break;
        case '3':
          chai.expect(change.doc).to.equal(undefined);
          chai.expect(getLastChangedDoc()).to.equal(false);
          break;
        case '4':
          chai.expect(change.doc).to.equal(undefined);
          chai.expect(getLastChangedDoc()._id).to.equal('5');
          break;
        case '5':
          chai.expect(change.doc._id).to.equal('5');
          chai.expect(change.doc.data).to.equal(2);
          chai.expect(getLastChangedDoc()).to.equal(false);
          break;
        default:
          done('Received invalid change');
        }

        if (calls === 5) {
          done();
        }
      }
    });

    dispatch.setLastChangedDoc(docs[0]);
    changesCalls.medic.callbacks.change(changes[0]);
    changesCalls.medic.callbacks.change(changes[1]);
    changesCalls.medic.callbacks.change(changes[2]);
    dispatch.setLastChangedDoc(docs[1]);
    changesCalls.medic.callbacks.change(changes[3]);
    changesCalls.medic.callbacks.change(changes[4]);
  });

  it('leaves change.doc unchanged when include_docs = true', done => {
    const changes = [
      { id: '1', doc: { _id: '1', data: 0 } },
      { id: '2', doc: { _id: '2', data: 0 } },
      { id: '3', doc: { _id: '3', data: 0 } },
      { id: '4', doc: { _id: '4', data: 0 } },
      { id: '5', doc: { _id: '5', data: 0 } }
    ];
    const docs = [{ _id: '2', data: 1 }, { _id: '5', data: 2 }];
    let calls = 0;
    service({
      key: 'test',
      filter: () => true,
      callback: change => {
        calls++;
        switch (change.id) {
        case '1':
          chai.expect(change.doc).to.equal(undefined);
          chai.expect(getLastChangedDoc()._id).to.equal('2');
          break;
        case '2':
          chai.expect(change.doc._id).to.equal('2');
          chai.expect(change.doc.data).to.equal(0);
          chai.expect(getLastChangedDoc()).to.equal(false);
          break;
        case '3':
          chai.expect(change.doc).to.equal(undefined);
          chai.expect(getLastChangedDoc()).to.equal(false);
          break;
        case '4':
          chai.expect(change.doc).to.equal(undefined);
          chai.expect(getLastChangedDoc()._id).to.equal('5');
          break;
        case '5':
          chai.expect(change.doc._id).to.equal('5');
          chai.expect(change.doc.data).to.equal(0);
          chai.expect(getLastChangedDoc()).to.equal(false);
          break;
        default:
          done('Received invalid change');
        }

        if (calls === 5) {
          done();
        }
      }
    });

    dispatch.setLastChangedDoc(docs[0]);
    changesCalls.medic.callbacks.change(changes[0]);
    changesCalls.medic.callbacks.change(changes[1]);
    changesCalls.medic.callbacks.change(changes[2]);
    dispatch.setLastChangedDoc(docs[1]);
    changesCalls.medic.callbacks.change(changes[3]);
    changesCalls.medic.callbacks.change(changes[4]);
  });
});
