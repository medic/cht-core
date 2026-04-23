import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateUserService } from '@admin-tool-services/create-user.service';

describe('CreateUserService', () => {
  let service: CreateUserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CreateUserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CreateUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  describe('Zero', () => {
    it('should be created', () => {
      expect(service).to.exist;
    });
  });

  describe('createUser', () => {
    it('should POST to /api/v3/users', async () => {
      const promise = service.createUser({ username: 'night_wing', password: 'Str0ng!Pass99' });
      const req = httpMock.expectOne('/api/v3/users');
      req.flush({});
      await promise;
      expect(req.request.method).to.equal('POST');
    });

    it('should send user data in request body', async () => {
      const user = { username: 'night_wing', password: 'Str0ng!Pass99', roles: ['national_admin'] };
      const promise = service.createUser(user);
      const req = httpMock.expectOne('/api/v3/users');
      req.flush({});
      await promise;
      expect(req.request.body).to.deep.equal(user);
    });

    it('should send Content-Type application/json', async () => {
      const promise = service.createUser({});
      const req = httpMock.expectOne('/api/v3/users');
      req.flush({});
      await promise;
      expect(req.request.headers.get('Content-Type')).to.equal('application/json');
    });

    it('should throw when request fails', async () => {
      const promise = service.createUser({});
      httpMock.expectOne('/api/v3/users').flush(
        { error: 'Bad request' },
        { status: 400, statusText: 'Bad Request' }
      );
      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(400);
      }
    });
  });

  describe('createMultipleUsers', () => {
    it('should POST to /api/v2/users', async () => {
      const csv = 'username,password\nnight_wing,Str0ng!Pass99';
      const promise = service.createMultipleUsers(csv);
      const req = httpMock.expectOne('/api/v2/users');
      req.flush([]);
      await promise;
      expect(req.request.method).to.equal('POST');
    });

    it('should send CSV string as request body', async () => {
      const csv = 'username,password\nnight_wing,Str0ng!Pass99';
      const promise = service.createMultipleUsers(csv);
      const req = httpMock.expectOne('/api/v2/users');
      req.flush([]);
      await promise;
      expect(req.request.body).to.equal(csv);
    });

    it('should send Content-Type text/csv', async () => {
      const promise = service.createMultipleUsers('csv');
      const req = httpMock.expectOne('/api/v2/users');
      req.flush([]);
      await promise;
      expect(req.request.headers.get('Content-Type')).to.equal('text/csv');
    });

    it('should return array of results', async () => {
      const mockResults = [
        { 'user-settings': { id: 'org.couchdb.user:night_wing' } },
        { error: 'Username already taken' },
      ];
      const promise = service.createMultipleUsers('csv');
      httpMock.expectOne('/api/v2/users').flush(mockResults);
      const result = await promise;
      expect(result).to.deep.equal(mockResults);
    });

    it('should throw when request fails', async () => {
      const promise = service.createMultipleUsers('csv');
      httpMock.expectOne('/api/v2/users').flush(
        { error: 'Server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );
      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });
});
