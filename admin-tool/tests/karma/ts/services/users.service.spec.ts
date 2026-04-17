import { TestBed } from '@angular/core/testing';
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

  beforeEach(() => {
    dbInstance = {
      query: sinon.stub(),
    };
    dbService = {
      get: sinon.stub().returns(dbInstance),
    };

    TestBed.configureTestingModule({
      providers: [
        UsersService,
        { provide: DbService, useValue: dbService },
      ],
    });

    service = TestBed.inject(UsersService);
  });

  afterEach(() => sinon.restore());

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
      dbInstance.query.resolves({ rows: [{ doc: null }, { doc: undefined }] });
      const result = await service.getUsers();
      expect(result).to.deep.equal([]);
    });
  });

  describe('One', () => {
    it('should return one active user', async () => {
      dbInstance.query.resolves({
        rows: [{
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
        }],
      });

      const result = await service.getUsers();

      expect(result).to.have.length(1);
      expect(result[0].username).to.equal('b_wayne');
      expect(result[0].fullname).to.equal('Bruce Wayne');
      expect(result[0].inactive).to.equal(false);
    });

    it('should return one inactive user', async () => {
      dbInstance.query.resolves({
        rows: [{
          doc: {
            _id: 'org.couchdb.user:b_wayne',
            name: 'b_wayne',
            fullname: 'Bruce Wayne',
            inactive: true,
          },
        }],
      });

      const result = await service.getUsers();

      expect(result).to.have.length(1);
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
              fullname: 'Bruce Wayne',
              roles: ['national_admin'],
              inactive: false,
            },
          },
          {
            doc: {
              _id: 'org.couchdb.user:c_kent',
              name: 'c_kent',
              fullname: 'Clark Kent',
              roles: ['chw'],
              inactive: true,
            },
          },
        ],
      });

      const result = await service.getUsers();

      expect(result).to.have.length(2);
      expect(result[0].username).to.equal('b_wayne');
      expect(result[1].username).to.equal('c_kent');
      expect(result[1].inactive).to.equal(true);
    });
  });

  describe('Boundaries', () => {
    it('should map all user fields correctly', async () => {
      dbInstance.query.resolves({
        rows: [{
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
        }],
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

    it('should handle user with no optional fields', async () => {
      dbInstance.query.resolves({
        rows: [{
          doc: {
            _id: 'org.couchdb.user:b_wayne',
            name: 'b_wayne',
          },
        }],
      });

      const result = await service.getUsers();

      expect(result[0].username).to.equal('b_wayne');
      expect(result[0].email).to.be.undefined;
      expect(result[0].phone).to.be.undefined;
    });
  });

  describe('Interface', () => {
    it('should query the correct CouchDB view', async () => {
      dbInstance.query.resolves({ rows: [] });

      await service.getUsers();

      expect(dbInstance.query.calledOnce).to.be.true;
      expect(dbInstance.query.firstCall.args[0]).to.equal('medic-client/doc_by_type');
      expect(dbInstance.query.firstCall.args[1]).to.deep.equal({
        include_docs: true,
        key: ['user-settings'],
      });
    });

    it('should call dbService.get to access the database', async () => {
      dbInstance.query.resolves({ rows: [] });

      await service.getUsers();

      expect(dbService.get.calledOnce).to.be.true;
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

  describe('Scenarios', () => {
    it('should return mix of active and inactive users preserving order', async () => {
      dbInstance.query.resolves({
        rows: [
          { doc: { _id: 'org.couchdb.user:user1', name: 'user1', inactive: false } },
          { doc: { _id: 'org.couchdb.user:user2', name: 'user2', inactive: true } },
          { doc: { _id: 'org.couchdb.user:user3', name: 'user3', inactive: false } },
        ],
      });

      const result = await service.getUsers();

      expect(result).to.have.length(3);
      expect(result[0].username).to.equal('user1');
      expect(result[1].inactive).to.equal(true);
      expect(result[2].username).to.equal('user3');
    });

    it('should notify usersUpdated$ multiple times', () => {
      const spy = sinon.spy();
      service.usersUpdated$.subscribe(spy);

      service.notifyUsersUpdated();
      service.notifyUsersUpdated();

      expect(spy.callCount).to.equal(3); // 1 initial + 2 notifications
    });
  });
});
