import { TestBed } from '@angular/core/testing';

import { ContactMutedService } from './contact-muted.service';

describe('ContactMutedService', () => {
  let service: ContactMutedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactMutedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
