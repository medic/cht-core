import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { expect, assert } from 'chai';
import sinon from 'sinon';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { LocationService } from '@mm-services/location.service';

import { UserLoginService } from '@mm-services/user-login.service';

describe('UserLogin service', () => {
  let service: UserLoginService;
  let httpMock: HttpTestingController;
  let location: LocationService;
  let deviceKeyService;

  const user = 'admin';
  const password = 'password';

  const getUrl = function() {
    location.dbName = 'medicdb';
    return '/' + location.dbName + '/login';
  };

  beforeEach(() => {
    deviceKeyService = { renew: sinon.stub().resolves() };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: DeviceKeyService, useValue: deviceKeyService }],
    });
    service = TestBed.inject(UserLoginService);
    httpMock = TestBed.inject(HttpTestingController);
    location = TestBed.inject(LocationService);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  it('should call login backend service', async () => {
    const url = getUrl();
    const data = JSON.stringify({
      user: 'admin',
      password: 'password',
      redirect: '',
      locale: ''
    });
    const login = service.login(user, password);
    const res = httpMock.expectOne(url);
    res.flush({ success: true });
    const result: any = await login;

    expect(result.success).to.equal(true);
    expect(res.request.body).to.deep.equal(data);
    // a password change logs the user straight back in, and the server has just dropped every
    // device key for them, so what this device holds has to be replaced rather than trusted
    expect(deviceKeyService.renew.callCount).to.equal(1);
  });

  /**
   * The caller is a modal showing a spinner until this returns, and the password has already
   * changed by the time the key work starts. HttpClient has no timeout of its own, so a request
   * that never answers must not hold the login open.
   */
  it('does not wait forever on a key registration that never answers', async () => {
    const clock = sinon.useFakeTimers({ shouldAdvanceTime: true });
    deviceKeyService.renew.returns(new Promise(() => undefined));
    const url = getUrl();

    const login = service.login(user, password);
    httpMock.expectOne(url).flush({ success: true });
    await clock.tickAsync(5000);

    expect(await login).to.deep.equal({ success: true });
    clock.restore();
  });

  /** A successful login answers with a redirect, which HttpClient surfaces as an error. */
  it('should renew the device key when the login answers with a redirect', async () => {
    const url = getUrl();
    const login = service.login(user, password);
    httpMock.expectOne(url).flush('', { status: 302, statusText: 'Found' });

    await login.catch(() => undefined);

    expect(deviceKeyService.renew.callCount).to.equal(1);
  });

  it('should return error call login backend service', () => {
    const url = getUrl();
    const login = service.login(user, password);
    const res = httpMock.expectOne(url);
    res.flush({message: 'Not logged in'}, {status: 401, statusText: 'Not logged in'});

    return login
      .then(() => {
        assert.fail('exception expected');
      })
      .catch(err => {
        expect(err).to.include({ status: 401, statusText: 'Not logged in' });
      });
  });
});
