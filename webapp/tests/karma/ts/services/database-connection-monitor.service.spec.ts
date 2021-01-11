import { TestBed } from '@angular/core/testing';

import { DatabaseConnectionMonitorService } from './database-connection-monitor.service';

describe('DatabaseConnectionMonitorService', () => {
  let service: DatabaseConnectionMonitorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatabaseConnectionMonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
