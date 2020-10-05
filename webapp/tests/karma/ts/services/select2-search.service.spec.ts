import { TestBed } from '@angular/core/testing';

import { Select2SearchService } from './select2-search.service';

describe('Select2SearchService', () => {
  let service: Select2SearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Select2SearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
