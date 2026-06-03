import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import { DOCUMENT } from '@angular/common';

import { LocationService } from '@admin-tool-services/location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            location: {
              protocol: 'https:',
              hostname: 'localhost',
              port: '5988',
              href: 'https://localhost:5988/medic/admin/',
            }
          }
        }
      ]
    });
    service = TestBed.inject(LocationService);
  });

  it('should have dbName set to medic', () => {
    expect(service.dbName).to.equal('medic');
  });

  it('should build url from document.location', () => {
    expect(service.url).to.equal('https://localhost:5988/medic');
  });

  it('should have default paths', () => {
    expect(service.path).to.equal('/');
    expect(service.adminPath).to.equal('/admin/');
  });

  describe('when port is empty', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: DOCUMENT,
            useValue: {
              location: {
                protocol: 'https:',
                hostname: 'example.com',
                port: '',
                href: 'https://example.com/medic/',
              }
            }
          }
        ]
      });
      service = TestBed.inject(LocationService);
    });

    it('should build url without port', () => {
      expect(service.url).to.equal('https://example.com/medic');
    });
  });
});
