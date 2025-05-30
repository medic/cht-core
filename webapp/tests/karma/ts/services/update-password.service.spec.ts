import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import { UpdatePasswordService } from '@mm-services/update-password.service';
import { provideHttpClient } from '@angular/common/http';

describe('Update password service', () => {
  let service: UpdatePasswordService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(UpdatePasswordService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('updates settings', async () => {
    const username = 'username';
    const currentPassword = 'currentPassword';
    const newPassword = 'newPassword';
    const successResponse = { success: true };
    const authB64 = window.btoa(`${username}:${currentPassword}`);

    const update = service.update(username, currentPassword, newPassword);
    const res = httpMock.expectOne('/api/v1/users/username');
    res.flush(successResponse);
    const result = await update;

    expect(result).to.equal(successResponse);
    expect(res.request.body).to.deep.equal({ password: 'newPassword' });
    expect(res.request.headers.get('Content-Type')).to.equal('application/json');
    expect(res.request.headers.get('Accept')).to.equal('application/json');
    expect(res.request.headers.get('Authorization')).to.equal(`Basic ${authB64}`);
  });
});
