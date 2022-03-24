import { TestBed, tick, fakeAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { PurgeService } from '@mm-services/purge.service';

import sinon from 'sinon';
import { of, throwError } from 'rxjs';
import { expect } from 'chai';

describe('Purge service', () => {
  let service:PurgeService;
  let httpClient;
  let setItem;

  beforeEach(() => {
    httpClient = { get: sinon.stub() };
    setItem = sinon.stub(window.localStorage, 'setItem');
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: httpClient }
      ]
    });
    service = TestBed.inject(PurgeService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('does nothing if empty response', async () => {
    const response = { purged_ids: [] };
    httpClient.get.withArgs('/purging/changes').returns(of(response));
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1);
    expect(setItem.callCount).to.equal(0);
  });

  it('does not query a second time in the same session', async () => {
    const response = { purged_ids: [] };
    httpClient.get.withArgs('/purging/changes').returns(of(response));
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1);
    expect(setItem.callCount).to.equal(0);
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1); // still just 1
    expect(setItem.callCount).to.equal(0);
  });

  it('handles request errors', async () => {
    httpClient.get.withArgs('/purging/changes').returns(throwError(new Error('boom')));
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1);
    expect(setItem.callCount).to.equal(0);
    // no error is thrown
  });

  it('updates to-purge list and writes checkpoint', fakeAsync(() => {
    const firstResponse = { purged_ids: ['a', 'b'], last_seq: 'xyz' };
    const secondResponse = { purged_ids: [], last_seq: 'something else' };
    httpClient.get
      .onCall(0).returns(of(firstResponse))
      .onCall(1).returns(of())
      .onCall(2).returns(of(secondResponse));
    service.updateDocsToPurge();
    tick();
    // TODO
    // expect(httpClient.get.callCount).to.equal(2);
    // expect(setItem.callCount).to.equal(1);
    // tick(1000); // wait for second batch
    expect(httpClient.get.callCount).to.equal(3);
    expect(httpClient.get.args[0][0]).to.equal('/purging/changes');
    expect(httpClient.get.args[1][0]).to.equal('/purging/checkpoint');
    expect(httpClient.get.args[1][1].params.seq).to.equal('xyz');
    expect(httpClient.get.args[2][0]).to.equal('/purging/changes');
    expect(setItem.callCount).to.equal(1);
    expect(setItem.args[0][0]).to.equal('cht-to-purge-list');
    expect(setItem.args[0][1]).to.equal('["a","b"]');
  }));

});
