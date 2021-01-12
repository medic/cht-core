import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { Subscription } from 'rxjs';

import { DatabaseConnectionMonitorService } from '@mm-services/database-connection-monitor.service';

describe('DatabaseConnectionMonitorService', () => {
  let service: DatabaseConnectionMonitorService;
  const subscriptions: Subscription = new Subscription();
  const originalPouchDB = window.PouchDB;
  window.PouchDB = require('pouchdb-browser').default;

  const triggerPouchDbDOMException = () => {
    let db = window.PouchDB('test', { auto_compaction: true });
    const write = i => {
      db
        .put({ _id: i + 'a', bar: 'bar' })
        .then(() => write(i + 1))
        .catch(err => {
          throw err;
        });
    };
    write(0);
    db.destroy();
    db = window.PouchDB('test', { auto_compaction: true });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatabaseConnectionMonitorService);
  });

  after(() => {
    window.PouchDB = originalPouchDB;
    subscriptions.unsubscribe();
  });

  it('should not resolve from another unhandled rejection', () => {
    const callback = sinon.stub();
    const subscription = service
      .listenForDatabaseClosed()
      .subscribe(callback);
    subscriptions.add(subscription);

    new Promise((resolve, reject) => reject('foo'));

    expect(callback.callCount).to.equal(0);
  });

  it('should resolve from DOMException', (done) => {
    const callback = sinon.stub().callsFake(() => {
      expect(callback.callCount).to.equal(1);
      done();
    });

    const subscription = service
      .listenForDatabaseClosed()
      .subscribe(callback);
    subscriptions.add(subscription);

    triggerPouchDbDOMException();
  });
});
