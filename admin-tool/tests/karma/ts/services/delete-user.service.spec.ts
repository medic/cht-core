import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { expect } from 'chai';
import sinon from 'sinon';
import { DeleteUserService } from '@admin-tool-services/delete-user.service';

describe('DeleteUserService', () => {
  let service: DeleteUserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DeleteUserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DeleteUserService);
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
      const promise = service.deleteUser('b_wayne');
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.method).to.equal('DELETE');
    });

    it('should include username in the URL', async () => {
      const promise = service.deleteUser('b_wayne');
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.url).to.include('b_wayne');
    });
  });

  describe('Boundaries', () => {
    it('should handle username with hyphens and underscores', async () => {
      const promise = service.deleteUser('b_wayne-test');
      const req = httpMock.expectOne('/api/v1/users/b_wayne-test');
      req.flush({});
      await promise;
      expect(req.request.url).to.equal('/api/v1/users/b_wayne-test');
    });
  });

  describe('Interface', () => {
    it('should return a promise', () => {
      const promise = service.deleteUser('b_wayne');
      httpMock.expectOne('/api/v1/users/b_wayne').flush({});
      expect(promise).to.be.instanceOf(Promise);
    });

    it('should resolve on success', async () => {
      const promise = service.deleteUser('b_wayne');
      httpMock.expectOne('/api/v1/users/b_wayne').flush({});
      await promise; // should not throw
    });

    it('should send no request body', async () => {
      const promise = service.deleteUser('b_wayne');
      const req = httpMock.expectOne('/api/v1/users/b_wayne');
      req.flush({});
      await promise;
      expect(req.request.body).to.be.null;
    });
  });

  describe('Exceptions', () => {
    it('should throw when the request fails', async () => {
      const promise = service.deleteUser('b_wayne');
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
      const promise = service.deleteUser('b_wayne');
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
    it('should delete different users independently', async () => {
      const promise1 = service.deleteUser('user1');
      const promise2 = service.deleteUser('user2');

      httpMock.expectOne('/api/v1/users/user1').flush({});
      httpMock.expectOne('/api/v1/users/user2').flush({});

      await Promise.all([promise1, promise2]);
    });
  });
});
