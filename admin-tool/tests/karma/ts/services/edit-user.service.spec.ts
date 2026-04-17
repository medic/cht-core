import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { expect } from 'chai';
import sinon from 'sinon';
import { EditUserService } from '@admin-tool-services/edit-user.service';

describe('EditUserService', () => {
  let service: EditUserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EditUserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(EditUserService);
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

  describe('One', () => {
    it('should call the correct endpoint', async () => {
      const promise = service.updateUser('b_wayne', { fullname: 'Bruce Wayne' });
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.method).to.equal('POST');
    });

    it('should send updates in the request body', async () => {
      const updates = { fullname: 'Bruce Wayne', email: 'bruce@wayne.com' };
      const promise = service.updateUser('b_wayne', updates);
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.body).to.deep.equal(updates);
    });
  });

  describe('Boundaries', () => {
    it('should include username in the URL path', async () => {
      const promise = service.updateUser('c_kent', { phone: '555-0102' });
      const req = httpMock.expectOne('/api/v1/users/c_kent');
      req.flush({});
      await promise;
      expect(req.request.url).to.include('c_kent');
    });

    it('should send empty updates object', async () => {
      const promise = service.updateUser('b_wayne', {});
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.body).to.deep.equal({});
    });
  });

  describe('Interface', () => {
    it('should return a promise', () => {
      const promise = service.updateUser('b_wayne', {});
      httpMock.expectOne('/api/v1/users/b_wayne').flush({});
      expect(promise).to.be.instanceOf(Promise);
    });

    it('should resolve on success', async () => {
      const promise = service.updateUser('b_wayne', { fullname: 'Bruce Wayne' });
      httpMock.expectOne('/api/v1/users/b_wayne').flush({});
      await promise; // should not throw
    });
  });

  describe('Exceptions', () => {
    it('should throw when the request fails', async () => {
      const promise = service.updateUser('b_wayne', { fullname: 'Bruce Wayne' });
      httpMock.expectOne('/api/v1/users/b_wayne').flush(
        { error: 'Not found' },
        { status: 404, statusText: 'Not Found' }
      );

      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(404);
      }
    });

    it('should throw on 403 forbidden', async () => {
      const promise = service.updateUser('b_wayne', { roles: ['_admin'] });
      httpMock.expectOne('/api/v1/users/b_wayne').flush(
        { error: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );

      try {
        await promise;
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.status).to.equal(403);
      }
    });
  });

  describe('Scenarios', () => {
    it('should send only changed fields', async () => {
      const updates = { email: 'new@wayne.com', phone: '555-9999' };
      const promise = service.updateUser('b_wayne', updates);
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(Object.keys(req.request.body)).to.have.length(2);
      expect(req.request.body.email).to.equal('new@wayne.com');
    });
  });
});
