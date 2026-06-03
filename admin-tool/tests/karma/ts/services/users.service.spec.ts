import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { UsersService } from '@admin-tool-services/users.service';
import { DbService } from '@admin-tool-services/db.service';

interface DbInstanceMock {
  query: SinonStub;
}

interface DbServiceMock {
  get: SinonStub;
}

describe('UsersService', () => {
  let service: UsersService;
  let dbService: DbServiceMock;
  let dbInstance: DbInstanceMock;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    dbInstance = { query: sinon.stub() };
    dbService = { get: sinon.stub().returns(dbInstance) };

    TestBed.configureTestingModule({
      providers: [
        UsersService,
        { provide: DbService, useValue: dbService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  // --- getUsers ---
  describe('getUsers', () => {
    describe('Zero', () => {
      it('should be created', () => {
        expect(service).to.exist;
      });

      it('should return empty array when no users exist', async () => {
        dbInstance.query.resolves({ rows: [] });
        const result = await service.getUsers();
        expect(result).to.deep.equal([]);
      });

      it('should return empty array when rows have no docs', async () => {
        dbInstance.query.resolves({
          rows: [{ doc: null }, { doc: undefined }],
        });
        const result = await service.getUsers();
        expect(result).to.deep.equal([]);
      });
    });

    describe('One', () => {
      it('should return one active user', async () => {
        dbInstance.query.resolves({
          rows: [
            {
              doc: {
                _id: 'org.couchdb.user:b_wayne',
                name: 'b_wayne',
                fullname: 'Bruce Wayne',
                email: 'bruce@wayne.com',
                phone: '555-0101',
                facility_id: 'f1',
                contact_id: 'c1',
                roles: ['national_admin'],
                inactive: false,
              },
            },
          ],
        });
        const result = await service.getUsers();
        expect(result).to.have.length(1);
        expect(result[0].username).to.equal('b_wayne');
        expect(result[0].inactive).to.equal(false);
      });

      it('should return one inactive user', async () => {
        dbInstance.query.resolves({
          rows: [
            {
              doc: {
                _id: 'org.couchdb.user:b_wayne',
                name: 'b_wayne',
                inactive: true,
              },
            },
          ],
        });
        const result = await service.getUsers();
        expect(result[0].inactive).to.equal(true);
      });
    });

    describe('Many', () => {
      it('should return multiple users including inactive ones', async () => {
        dbInstance.query.resolves({
          rows: [
            {
              doc: {
                _id: 'org.couchdb.user:b_wayne',
                name: 'b_wayne',
                inactive: false,
              },
            },
            {
              doc: {
                _id: 'org.couchdb.user:c_kent',
                name: 'c_kent',
                inactive: true,
              },
            },
          ],
        });
        const result = await service.getUsers();
        expect(result).to.have.length(2);
        expect(result[1].inactive).to.equal(true);
      });
    });

    describe('Boundaries', () => {
      it('should map all user fields correctly', async () => {
        dbInstance.query.resolves({
          rows: [
            {
              doc: {
                _id: 'org.couchdb.user:b_wayne',
                name: 'b_wayne',
                fullname: 'Bruce Wayne',
                email: 'bruce@wayne.com',
                phone: '555-0101',
                facility_id: ['f1', 'f2'],
                contact_id: 'c1',
                roles: ['chw'],
                inactive: false,
              },
            },
          ],
        });
        const result = await service.getUsers();
        expect(result[0]).to.deep.equal({
          id: 'org.couchdb.user:b_wayne',
          username: 'b_wayne',
          fullname: 'Bruce Wayne',
          email: 'bruce@wayne.com',
          phone: '555-0101',
          facility_id: ['f1', 'f2'],
          contact_id: 'c1',
          roles: ['chw'],
          inactive: false,
        });
      });
    });

    describe('Interface', () => {
      it('should query the correct CouchDB view', async () => {
        dbInstance.query.resolves({ rows: [] });
        await service.getUsers();
        expect(dbInstance.query.calledOnce).to.be.true;
        expect(dbInstance.query.firstCall.args[0]).to.equal(
          'medic-client/doc_by_type',
        );
        expect(dbInstance.query.firstCall.args[1]).to.deep.equal({
          include_docs: true,
          key: ['user-settings'],
        });
      });

      it('should notify subscribers when notifyUsersUpdated is called', () => {
        const spy = sinon.spy();
        service.usersUpdated$.subscribe(spy);
        service.notifyUsersUpdated();
        expect(spy.callCount).to.equal(2); // once on subscribe, once on notify
      });
    });

    describe('Exceptions', () => {
      it('should throw when the query fails', async () => {
        dbInstance.query.rejects(new Error('DB error'));
        try {
          await service.getUsers();
          expect.fail('should have thrown');
        } catch (err: any) {
          expect(err.message).to.equal('DB error');
        }
      });
    });
  });

  // --- createUser ---
  describe('createUser', () => {
    it('should POST to /api/v3/users', async () => {
      const promise = service.createUser({
        username: 'b_wayne',
        password: 'Str0ng!Pass99',
      });
      const req = httpMock.expectOne('/api/v3/users');
      req.flush({});
      await promise;
      expect(req.request.method).to.equal('POST');
    });

    it('should send user data in request body', async () => {
      const user = { username: 'b_wayne', roles: ['national_admin'] };
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
      expect(req.request.headers.get('Content-Type')).to.equal(
        'application/json',
      );
    });

    it('should throw when request fails', async () => {
      const promise = service.createUser({});
      httpMock
        .expectOne('/api/v3/users')
        .flush(
          { error: 'Bad request' },
          { status: 400, statusText: 'Bad Request' },
        );
      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(400);
      }
    });
  });

  // --- createMultipleUsers ---
  describe('createMultipleUsers', () => {
    it('should POST to /api/v2/users', async () => {
      const promise = service.createMultipleUsers('csv');
      const req = httpMock.expectOne('/api/v2/users');
      req.flush([]);
      await promise;
      expect(req.request.method).to.equal('POST');
    });

    it('should send CSV string as request body', async () => {
      const csv = 'username,password\nb_wayne,Str0ng!Pass99';
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
        { 'user-settings': { id: 'org.couchdb.user:b_wayne' } },
        { error: 'Username already taken' },
      ];
      const promise = service.createMultipleUsers('csv');
      httpMock.expectOne('/api/v2/users').flush(mockResults);
      const result = await promise;
      expect(result).to.deep.equal(mockResults);
    });

    it('should throw when request fails', async () => {
      const promise = service.createMultipleUsers('csv');
      httpMock
        .expectOne('/api/v2/users')
        .flush(
          { error: 'Server error' },
          { status: 500, statusText: 'Internal Server Error' },
        );
      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(500);
      }
    });
  });

  // --- updateUser ---
  describe('updateUser', () => {
    it('should POST to /api/v1/users/:username', async () => {
      const promise = service.updateUser('b_wayne', {
        fullname: 'Bruce Wayne',
      });
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.method).to.equal('POST');
    });

    it('should send updates in request body', async () => {
      const updates = { fullname: 'Bruce Wayne', email: 'bruce@wayne.com' };
      const promise = service.updateUser('b_wayne', updates);
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.body).to.deep.equal(updates);
    });

    it('should include username in URL', async () => {
      const promise = service.updateUser('c_kent', { phone: '555-0102' });
      const req = httpMock.expectOne('/api/v1/users/c_kent');
      req.flush({});
      await promise;
      expect(req.request.url).to.include('c_kent');
    });

    it('should throw when request fails', async () => {
      const promise = service.updateUser('b_wayne', {});
      httpMock
        .expectOne('/api/v1/users/b_wayne')
        .flush(
          { error: 'Forbidden' },
          { status: 403, statusText: 'Forbidden' },
        );
      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(403);
      }
    });
  });

  // --- deleteUser ---
  describe('deleteUser', () => {
    it('should DELETE /api/v1/users/:username', async () => {
      const promise = service.deleteUser('b_wayne');
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.method).to.equal('DELETE');
    });

    it('should include username in URL', async () => {
      const promise = service.deleteUser('b_wayne');
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.url).to.include('b_wayne');
    });

    it('should send no request body', async () => {
      const promise = service.deleteUser('b_wayne');
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.body).to.be.null;
    });

    it('should throw when request fails', async () => {
      const promise = service.deleteUser('b_wayne');
      httpMock
        .expectOne('/api/v1/users/b_wayne')
        .flush(
          { error: 'Not found' },
          { status: 404, statusText: 'Not Found' },
        );
      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(404);
      }
    });
  });
});
