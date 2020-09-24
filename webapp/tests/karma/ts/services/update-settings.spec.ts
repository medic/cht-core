import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { expect } from 'chai';

import { UpdateSettingsService } from '@mm-services/update-settings.service';

describe('UpdateSettings service', () => {
  let service: UpdateSettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(UpdateSettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('updates settings', () => {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    service.update(updates).then((result: any) => {
      expect(result.success).to.equal(true);
    });
    const res = httpMock.expectOne('/api/v1/settings?replace=undefined');
    expect(res.request.body).to.deep.equal(updates);
    res.flush({ success: true });
  });

  it('replaces settings', () => {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    service.update(updates, { replace: true }).then((result: any) => {
      expect(result.success).to.equal(true);
    });
    const res = httpMock.expectOne('/api/v1/settings?replace=true');
    expect(res.request.body).to.deep.equal(updates);
    res.flush({ success: true });
  });

  it('returns errors', (done) => {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    service.update(updates, { replace: true })
      .then(() => {
        done(new Error('expected error'));
      })
      .catch((err) => {
        expect(err.statusText).to.equal('Server error');
        done();
      });
    const res = httpMock.expectOne('/api/v1/settings?replace=true');
    res.flush({message: 'my error message'}, {status: 500, statusText: 'Server error'});
  });
});
