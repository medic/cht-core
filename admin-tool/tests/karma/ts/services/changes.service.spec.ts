import { TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@admin-tool-services/db.service';
import { ChangesService } from '@admin-tool-services/changes.service';

describe('ChangesService', () => {
  let service: ChangesService;
  let dbService;
  let changeCallbacks: Record<string, Function>;
  let changesStub;

  const onProvider = (store: Record<string, Function>) => ({
    on: (type, cb) => {
      store[type] = cb;
      return onProvider(store);
    },
  });

  beforeEach(waitForAsync(() => {
    changeCallbacks = {};

    changesStub = sinon.stub().callsFake(() => onProvider(changeCallbacks));

    dbService = {
      get: sinon.stub().returns({
        info: sinon.stub().resolves({ update_seq: 'test-seq' }),
        changes: changesStub,
      }),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DbService, useValue: dbService }],
    });

    service = TestBed.inject(ChangesService);
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should call info on init and start watching changes', async () => {
    await Promise.resolve(); // allow init promise to settle
    expect(dbService.get().info.callCount).to.equal(1);
    expect(changesStub.callCount).to.equal(1);
  });

  it('should pass lastSeq from info to changes since option', async () => {
    await Promise.resolve();
    const callOptions = changesStub.args[0][0];
    expect(callOptions.since).to.equal('test-seq');
  });

  it('should use live and include_docs=false options', async () => {
    await Promise.resolve();
    const callOptions = changesStub.args[0][0];
    expect(callOptions.live).to.be.true;
    expect(callOptions.include_docs).to.be.false;
  });

  describe('subscribe', () => {
    it('should invoke the callback when a change fires', (done) => {
      const expected = { id: 'some-doc', seq: 1 };

      service.subscribe({
        key: 'test',
        callback: (change) => {
          expect(change).to.deep.equal(expected);
          done();
        },
      });

      changeCallbacks['change'](expected);
    });

    it('should invoke the callback when filter returns true', (done) => {
      const expected = { id: 'specific-doc', seq: 2 };

      service.subscribe({
        key: 'test',
        filter: (change) => change.id === 'specific-doc',
        callback: (change) => {
          expect(change).to.deep.equal(expected);
          done();
        },
      });

      changeCallbacks['change']({ id: 'other-doc', seq: 1 });
      changeCallbacks['change'](expected);
    });

    it('should not invoke the callback when filter returns false', () => {
      const callback = sinon.stub();

      service.subscribe({
        key: 'test',
        filter: (change) => change.id === 'only-this',
        callback,
      });

      changeCallbacks['change']({ id: 'different', seq: 1 });

      expect(callback.callCount).to.equal(0);
    });

    it('should replace an existing subscription with the same key', (done) => {
      const firstCallback = sinon.stub();
      const secondCallback = sinon.stub().callsFake(() => {
        expect(firstCallback.callCount).to.equal(0);
        done();
      });

      service.subscribe({ key: 'duplicate', callback: firstCallback });
      service.subscribe({ key: 'duplicate', callback: secondCallback });

      changeCallbacks['change']({ id: 'x', seq: 1 });
    });

    it('should support multiple concurrent subscriptions', (done) => {
      let count = 0;
      const finish = () => {
        if (++count === 2) {
          done();
        }
      };

      service.subscribe({ key: 'first', callback: finish });
      service.subscribe({ key: 'second', callback: finish });

      changeCallbacks['change']({ id: 'y', seq: 1 });
    });

    it('should stop receiving changes after unsubscribe', () => {
      const callback = sinon.stub();
      const { unsubscribe } = service.subscribe({ key: 'unsub-test', callback });

      unsubscribe();
      changeCallbacks['change']({ id: 'z', seq: 1 });

      expect(callback.callCount).to.equal(0);
    });

    it('should debounce rapid changes when debounce option is set', fakeAsync(() => {
      const callback = sinon.stub();

      service.subscribe({ key: 'debounce-test', debounce: 100, callback });

      changeCallbacks['change']({ id: 'a', seq: 1 });
      changeCallbacks['change']({ id: 'b', seq: 2 });
      changeCallbacks['change']({ id: 'c', seq: 3 });

      tick(50);
      expect(callback.callCount).to.equal(0);

      tick(100);
      expect(callback.callCount).to.equal(1);
    }));
  });

  describe('killWatchers', () => {
    it('should cancel all active watches', async () => {
      const cancelStub = sinon.stub();
      const watchWithCancel = {
        on: (type, cb) => {
          changeCallbacks[type] = cb;
          return watchWithCancel;
        },
      };
      changesStub.callsFake(() => watchWithCancel);

      // Re-init the service to pick up updated changesStub
      TestBed.resetTestingModule();
      dbService.get.returns({
        info: sinon.stub().resolves({ update_seq: 0 }),
        changes: sinon.stub().callsFake(() => ({
          on: sinon.stub().returnsThis(),
          cancel: cancelStub,
        })),
      });
      TestBed.configureTestingModule({
        providers: [{ provide: DbService, useValue: dbService }],
      });
      const svc = TestBed.inject(ChangesService);
      await Promise.resolve();

      svc.killWatchers();

      expect(cancelStub.callCount).to.equal(1);
    });
  });

  describe('error handling', () => {
    it('should retry watchChanges after error', fakeAsync(() => {
      const firstChangesCalls = changesStub.callCount;

      changeCallbacks['error'](new Error('connection lost'));

      tick(5000);

      expect(changesStub.callCount).to.be.greaterThan(firstChangesCalls);
    }));
  });
});
