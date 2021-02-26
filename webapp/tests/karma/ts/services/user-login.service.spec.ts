import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { expect, assert } from 'chai';
import { LocationService } from '@mm-services/location.service';

import { UserLoginService } from '@mm-services/user-login.service';

describe('UserLogin service', () => {
  let service: UserLoginService;
  let httpMock: HttpTestingController;
  let location: LocationService;

  const user = 'admin';
  const password = 'password';

  const getUrl = function() {
    location.dbName = 'medicdb';
    return '/' + location.dbName + '/login';
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(UserLoginService);
    httpMock = TestBed.inject(HttpTestingController);
    location = TestBed.inject(LocationService);
  });

  afterEach(() => {
    httpMock.verify();
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
