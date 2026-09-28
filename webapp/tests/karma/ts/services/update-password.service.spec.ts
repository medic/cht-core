import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { UpdatePasswordService } from '@mm-services/update-password.service';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { provideHttpClient } from '@angular/common/http';

describe('Update password service', () => {
  let service: UpdatePasswordService;
  let httpMock: HttpTestingController;
  let deviceKeyService;

  beforeEach(() => {
    deviceKeyService = { forget: sinon.stub().resolves() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DeviceKeyService, useValue: deviceKeyService },
      ]
    });
    service = TestBed.inject(UpdatePasswordService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
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

  // The server drops every device key for this user at the same moment, so a device that kept its
  // own copy would believe it was still registered and never provision a new one.
  it('makes this device forget its offline data bundle key', async () => {
    const update = service.update('username', 'currentPassword', 'newPassword');
    httpMock.expectOne('/api/v1/users/username').flush({ success: true });
    await update;

    expect(deviceKeyService.forget.callCount).to.equal(1);
  });
});
