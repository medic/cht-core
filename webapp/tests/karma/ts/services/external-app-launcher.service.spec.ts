import { TestBed } from '@angular/core/testing';

import { ExternalAppLauncherService } from './external-app-launcher.service';

describe('ExternalAppLauncherService', () => {
  let service: ExternalAppLauncherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExternalAppLauncherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
