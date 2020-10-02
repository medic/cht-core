import { TestBed } from '@angular/core/testing';

import { CountMessageService } from './count-message.service';

describe('CountMessageService', () => {
  let service: CountMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
