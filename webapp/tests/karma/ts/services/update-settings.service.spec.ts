import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { expect, assert } from 'chai';

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

  it('updates settings', async () => {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    const update = service.update(updates);
    const res = httpMock.expectOne('/api/v1/settings?replace=undefined');
    res.flush({ success: true });
    const result: any = await update;

    expect(result.success).to.equal(true);
    expect(res.request.body).to.deep.equal(updates);
  });

  it('replaces settings', async () => {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    const update = service.update(updates, { replace: true });
    const res = httpMock.expectOne('/api/v1/settings?replace=true');
    res.flush({ success: true });
    const result: any = await update;

    expect(result.success).to.equal(true);
    expect(res.request.body).to.deep.equal(updates);
  });

  it('returns errors', () => {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    const update = service.update(updates, { replace: true });
    const res = httpMock.expectOne('/api/v1/settings?replace=true');
    res.flush({message: 'my error message'}, {status: 500, statusText: 'Server error'});

    return update
      .then(() => {
        assert.fail('exception expected');
      })
      .catch(err => {
        expect(err).to.include({ statusText: 'Server error' });
      });
  });
});
