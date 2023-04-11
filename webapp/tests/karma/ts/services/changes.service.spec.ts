import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@mm-services/db.service';
import { ServicesActions } from '@mm-actions/services';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { Selectors } from '@mm-selectors/index';

describe('Changes service', () => {
  let service:ChangesService;
  let dbService;
  let sessionService;
  let store:MockStore;
  let changesCalls;

  const onProvider = (db) => {
    return {
      on: (type, callback) => {
        db.callbacks[type] = callback;
        return onProvider(db);
      }
    };
  };

  beforeEach(waitForAsync(() => {
    changesCalls = {
      medic: { callCount: 0, callOptions: null, callbacks: {} },
      meta:  { callCount: 0, callOptions: null, callbacks: {} }
    };

    dbService = {
      get: (dbOptions) => ({
        changes: (changesOptions) => {
          const db = changesCalls[dbOptions.meta ? 'meta' : 'medic'];
          db.callOptions = changesOptions;
          db.callCount++;
          return onProvider(db);
        },
        info: sinon.stub().resolves({ update_seq: 'test' }),
      }),
    };
    sessionService = {
      isOnlineOnly: sinon.stub(),
      userCtx: sinon.stub().returns({ name: 'user' }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ selectors: [{ selector: Selectors.getLastChangedDoc, value: false }] }),
        { provide: SessionService, useValue: sessionService },
        { provide: DbService, useValue: dbService },
      ]
    });

    service = TestBed.inject(ChangesService);
    store = TestBed.inject(MockStore);
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should call the callback', (done) => {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service.subscribe({
      key: 'test',
      filter: () => {
        return true;
      },
      callback: (actual) => {
        expect(actual).to.equal(expected);
        expect(changesCalls.medic.callCount).to.equal(1);
        expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('should call the callback for the meta db too', (done) => {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service.subscribe({
      key: 'test',
      metaDb: true,
      filter: () => {
        return true;
      },
      callback: (actual) => {
        expect(actual).to.equal(expected);
        expect(changesCalls.medic.callCount).to.equal(1);
        expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.meta.callbacks.change(expected);
  });

  it('should call the most recent callback only', (done) => {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service.subscribe({
      key: 'test',
      filter: () => {
        return true;
      },
      callback: () => {
        expect(false).to.equal(true);
      }
    });

    service.subscribe({
      key: 'test',
      filter: () => {
        return true;
      },
      callback: (actual) => {
        expect(actual).to.equal(expected);
        expect(changesCalls.medic.callCount).to.equal(1);
        expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('should call all registered callbacks', (done) => {

    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };
    const results = { key1: [], key2: [] };

    service.subscribe({
      key: 'key1',
      filter: () => {
        return true;
      },
      callback: (actual) => {
        results.key1.push(actual);
      }
    });

    service.subscribe({
      key: 'key2',
      filter: () => {
        return true;
      },
      callback: (actual) => {
        results.key2.push(actual);
      }
    });

    changesCalls.medic.callbacks.change(expected);

    expect(results.key1.length).to.equal(1);
    expect(results.key2.length).to.equal(1);
    expect(results.key1[0]).to.equal(expected);
    expect(results.key2[0]).to.equal(expected);
    expect(changesCalls.medic.callCount).to.equal(1);
    expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('should call the callback if filter passes', (done) => {
    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };
    const results = { key1: [], key2: [] };

    service.subscribe({
      key: 'key1',
      filter: () => {
        return false;
      },
      callback: (actual) => {
        results.key1.push(actual);
      }
    });

    service.subscribe({
      key: 'key2',
      filter: () => {
        return true;
      },
      callback: (actual) => {
        results.key2.push(actual);
      }
    });

    changesCalls.medic.callbacks.change(expected);

    expect(results.key1.length).to.equal(0);
    expect(results.key2.length).to.equal(1);
    expect(results.key2[0]).to.equal(expected);
    expect(changesCalls.medic.callCount).to.equal(1);
    expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('should call the callback after debounce time is completed', fakeAsync(() => {
    const options = {
      key: 'abc',
      debounce: 500,
      callback: sinon.stub()
    };

    service.subscribe(options);
    changesCalls.medic.callbacks.change({ doc: {} });

    tick(150);
    expect(options.callback.callCount).to.equal(0);
    tick(150);
    expect(options.callback.callCount).to.equal(0);
    tick(200);
    expect(options.callback.callCount).to.equal(1);
  }));

  it('should remove the listener when unsubscribe called', (done) => {
    // register callback
    const listener = service.subscribe({
      key: 'yek',
      callback: () => {
        throw new Error('Callback should have been deregistered');
      }
    });

    // unsubscribe callback
    listener.unsubscribe();

    changesCalls.medic.callbacks.change({ id: 'x', changes: [ { rev: '2-abc' } ] });

    expect(changesCalls.medic.callCount).to.equal(1);
    expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('should re-register the callback next time', (done) => {
    const expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    // register callback
    const listener = service.subscribe({
      key: 'yek',
      callback: () => {
        throw new Error('Callback should have been deregistered');
      }
    });

    // unsubscribe callback
    listener.unsubscribe();

    // re-subscribe callback
    service.subscribe({
      key: 'yek',
      callback: (actual) => {
        expect(actual).to.equal(expected);
        expect(changesCalls.medic.callCount).to.equal(1);
        expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('should re-attach where it left off if it loses connection', (done) => {
    const consoleErrorMock = sinon.stub(console, 'error');
    const clock = sinon.useFakeTimers();
    const first = { seq: '2-XYZ', id: 'x', changes: [ { rev: '2-abc' } ] };
    const second = { seq: '3-ZYX', id: 'y', changes: [ { rev: '1-abc' } ] };

    service.subscribe({
      key: 'test',
      filter: () => {
        return true;
      },
      callback: () => {
        if (changesCalls.medic.callCount === 1) {
          expect(changesCalls.medic.callOptions.since).to.equal('test');
        }
        if (changesCalls.medic.callCount === 2) {
          expect(changesCalls.medic.callOptions.since).to.equal('2-XYZ');
          clock.restore();
          done();
        }
      }
    });

    changesCalls.medic.callbacks.change(first);
    changesCalls.medic.callbacks.error(new Error('Test error'));
    clock.tick(10000);
    changesCalls.medic.callbacks.change(second);
    expect(consoleErrorMock.callCount).to.equal(2);
    expect(consoleErrorMock.args[0][0]).to.equal('Error watching for db changes');
    expect(consoleErrorMock.args[1][0]).to.equal('Attempting changes reconnection in 5 seconds');
  });

  it('should hydrate the change with a doc when it matches the last update when include_docs = false', done => {
    const setLastChangedDoc = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');
    const changes = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' }
    ];
    const docs = [{ _id: '2', data: 1 }, { _id: '5', data: 2 }];
    let calls = 0;
    service.subscribe({
      key: 'test',
      filter: () => true,
      callback: change => {
        calls++;
        switch (change.id) {
        case '1':
          expect(change.doc).to.equal(undefined);
          expect(setLastChangedDoc.callCount).to.equal(0);
          break;
        case '2':
          expect(change.doc._id).to.equal('2');
          expect(change.doc.data).to.equal(1);
          expect(setLastChangedDoc.callCount).to.equal(1);
          expect(setLastChangedDoc.args[0]).to.deep.equal([false]);
          break;
        case '3':
          expect(change.doc).to.equal(undefined);
          expect(setLastChangedDoc.callCount).to.equal(0);
          break;
        case '4':
          expect(change.doc).to.equal(undefined);
          expect(setLastChangedDoc.callCount).to.equal(0);
          break;
        case '5':
          expect(change.doc._id).to.equal('5');
          expect(change.doc.data).to.equal(2);
          expect(setLastChangedDoc.callCount).to.equal(1);
          expect(setLastChangedDoc.args[0]).to.deep.equal([false]);
          break;
        default:
          done('Received invalid change');
        }

        if (calls === 5) {
          done();
        }
      }
    });

    store.overrideSelector(Selectors.getLastChangedDoc, docs[0]);
    store.refreshState();
    changesCalls.medic.callbacks.change(changes[0]);
    setLastChangedDoc.resetHistory();
    changesCalls.medic.callbacks.change(changes[1]);
    setLastChangedDoc.resetHistory();
    changesCalls.medic.callbacks.change(changes[2]);
    setLastChangedDoc.resetHistory();
    store.overrideSelector(Selectors.getLastChangedDoc, docs[1]);
    store.refreshState();
    changesCalls.medic.callbacks.change(changes[3]);
    setLastChangedDoc.resetHistory();
    changesCalls.medic.callbacks.change(changes[4]);
  });

  it('should leave change.doc unchanged when include_docs = true', done => {
    const setLastChangedDoc = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');
    const changes = [
      { id: '1', doc: { _id: '1', data: 0 } },
      { id: '2', doc: { _id: '2', data: 0 } },
      { id: '3', doc: { _id: '3', data: 0 } },
      { id: '4', doc: { _id: '4', data: 0 } },
      { id: '5', doc: { _id: '5', data: 0 } }
    ];
    const docs = [{ _id: '2', data: 1 }, { _id: '5', data: 2 }];
    let calls = 0;
    service.subscribe({
      key: 'test',
      filter: () => true,
      callback: change => {
        calls++;
        switch (change.id) {
        case '1':
          expect(change.doc).to.deep.equal({ _id: '1', data: 0 });
          expect(setLastChangedDoc.callCount).to.equal(0);
          break;
        case '2':
          expect(change.doc._id).to.equal('2');
          expect(change.doc.data).to.equal(0);
          expect(setLastChangedDoc.callCount).to.equal(1);
          expect(setLastChangedDoc.args[0]).to.deep.equal([false]);
          break;
        case '3':
          expect(change.doc).to.deep.equal({ _id: '3', data: 0 });
          expect(setLastChangedDoc.callCount).to.equal(0);
          break;
        case '4':
          expect(change.doc).to.deep.equal({ _id: '4', data: 0 });
          expect(setLastChangedDoc.callCount).to.equal(0);
          break;
        case '5':
          expect(change.doc._id).to.equal('5');
          expect(change.doc.data).to.equal(0);
          expect(setLastChangedDoc.callCount).to.equal(1);
          expect(setLastChangedDoc.args[0]).to.deep.equal([false]);
          break;
        default:
          done('Received invalid change');
        }

        if (calls === 5) {
          done();
        }
      }
    });

    store.overrideSelector(Selectors.getLastChangedDoc, docs[0]);
    store.refreshState();
    changesCalls.medic.callbacks.change(changes[0]);
    setLastChangedDoc.resetHistory();
    changesCalls.medic.callbacks.change(changes[1]);
    setLastChangedDoc.resetHistory();
    changesCalls.medic.callbacks.change(changes[2]);
    setLastChangedDoc.resetHistory();
    store.overrideSelector(Selectors.getLastChangedDoc, docs[1]);
    store.refreshState();
    changesCalls.medic.callbacks.change(changes[3]);
    setLastChangedDoc.resetHistory();
    changesCalls.medic.callbacks.change(changes[4]);
  });
});

