import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { Subscription } from 'rxjs';

import { DatabaseConnectionMonitorService } from '@mm-services/database-connection-monitor.service';

describe('DatabaseConnectionMonitorService', () => {
  let service: DatabaseConnectionMonitorService;
  let subscriptions;

  const DB_CLOSED_MESSAGE = 'Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.';

  beforeEach(() => {
    subscriptions = new Subscription();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatabaseConnectionMonitorService);
  });

  afterEach(() => {
    subscriptions.unsubscribe();
  });

  it('should not resolve from another unhandled rejection', () => {
    const callback = sinon.stub();
    const subscription = service
      .listenForDatabaseClosed()
      .subscribe(callback);
    subscriptions.add(subscription);

    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: { message: 'some other error' },
    }));

    expect(callback.callCount).to.equal(0);
  });

  it('should resolve from DOMException', () => {
    const callback = sinon.stub();
    const subscription = service
      .listenForDatabaseClosed()
      .subscribe(callback);
    subscriptions.add(subscription);

    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: { message: DB_CLOSED_MESSAGE },
    }));

    expect(callback.callCount).to.equal(1);
  });
});
