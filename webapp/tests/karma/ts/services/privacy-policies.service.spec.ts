import { TestBed } from '@angular/core/testing';

import { PrivacyPoliciesService } from './privacy-policies.service';

describe('PrivacyPoliciesService', () => {
  let service: PrivacyPoliciesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrivacyPoliciesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
