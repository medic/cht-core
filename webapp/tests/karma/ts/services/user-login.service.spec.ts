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
  const tick = () => new Promise(resolve => setTimeout(resolve));

  const getUrl = function() {
    location.dbName = 'medicdb';
    return '/' + location.dbName + '/login';
  };

  beforeEach(() => {
    deviceKeyService = {
      clearDeviceKeys: sinon.stub().resolves(),
      registerIfPermitted: sinon.stub().resolves(),
    };
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
    await tick();
    expect(deviceKeyService.clearDeviceKeys.callCount).to.equal(1);
    expect(deviceKeyService.registerIfPermitted.callCount).to.equal(1);
  });

  it('registers only once the old key has been cleared', async () => {
    let cleared;
    deviceKeyService.clearDeviceKeys.returns(new Promise<void>(resolve => cleared = resolve));
    const url = getUrl();

    const login = service.login(user, password);
    httpMock.expectOne(url).flush({ success: true });
    await login;
    await tick();
    expect(deviceKeyService.registerIfPermitted.callCount).to.equal(0);

    cleared();
    await tick();
    expect(deviceKeyService.registerIfPermitted.callCount).to.equal(1);
  });

  /** The key work runs in the background, so a request that never answers cannot hold the login. */
  it('does not wait on the device key', async () => {
    deviceKeyService.clearDeviceKeys.returns(new Promise(() => undefined));
    const url = getUrl();

    const login = service.login(user, password);
    httpMock.expectOne(url).flush({ success: true });

    expect(await login).to.deep.equal({ success: true });
  });

  it('logs a failure to renew the device key', async () => {
    const consoleError = sinon.stub(console, 'error');
    deviceKeyService.clearDeviceKeys.rejects(new Error('storage is unavailable'));
    const url = getUrl();

    const login = service.login(user, password);
    httpMock.expectOne(url).flush({ success: true });
    await login;
    await tick();

    expect(consoleError.args[0][0]).to.equal('UserLogin :: Error renewing the device key');
  });

  /** A successful login answers with a redirect, which HttpClient surfaces as an error. */
  it('should renew the device key when the login answers with a redirect', async () => {
    const url = getUrl();
    const login = service.login(user, password);
    httpMock.expectOne(url).flush('', { status: 302, statusText: 'Found' });

    await login.catch(() => undefined);
    await tick();

    expect(deviceKeyService.clearDeviceKeys.callCount).to.equal(1);
    expect(deviceKeyService.registerIfPermitted.callCount).to.equal(1);
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
