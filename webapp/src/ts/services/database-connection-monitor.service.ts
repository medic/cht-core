import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseConnectionMonitorService {
  private databaseClosedSubject = new Subject();

  constructor() { }

  listenForDatabaseClosed() {
    window.addEventListener('unhandledrejection', (promiseRejectionEvent) => {
      if (
        promiseRejectionEvent &&
        promiseRejectionEvent.reason &&
        promiseRejectionEvent.reason.message ===
        'Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.'
      ) {
        this.databaseClosedSubject.next(promiseRejectionEvent);
      }
    });

    return this.databaseClosedSubject;
  }
}
