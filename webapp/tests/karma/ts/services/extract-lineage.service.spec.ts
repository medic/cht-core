import { TestBed } from '@angular/core/testing';

import { ExtractLineageService } from './extract-lineage.service';

describe('ExtractLineageService', () => {
  let service: ExtractLineageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtractLineageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
