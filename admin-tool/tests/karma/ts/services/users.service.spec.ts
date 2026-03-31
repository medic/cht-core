import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { UsersService } from '@admin-tool-services/users.service';

describe('UsersService', () => {
  let service: UsersService;
  let http: any;

  beforeEach(() => {
    http = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [UsersService, { provide: HttpClient, useValue: http }],
    });

    service = TestBed.inject(UsersService);
  });

  afterEach(() => sinon.restore());

  it('should be created', () => {
    expect(service).to.exist;
  });

  it('should call the correct endpoint', async () => {
    http.get.returns(of([]));

    await service.getUsers();

    expect(http.get.calledWith('/api/v2/users')).to.equal(true);
  });

  it('should return list of users', async () => {
    const mockUsers = [
      { id: 1, name: 'b_wayne', fullname: 'Bruce Wayne' },
      { id: 2, name: 't_stark', fullname: 'Tony Stark' },
    ];
    http.get.returns(of(mockUsers));

    const result = await service.getUsers();

    expect(result).to.deep.equal(mockUsers);
  });

  it('should return empty array when no users exist', async () => {
    http.get.returns(of([]));

    const result = await service.getUsers();

    expect(result).to.be.an('array');
    expect(result.length).to.equal(0);
  });

  it('should throw when the request fails', async () => {
    http.get.returns(throwError(() => new Error('Network error')));

    try {
      await service.getUsers();
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).to.equal('Network error');
    }
  });
});
