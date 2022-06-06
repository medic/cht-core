import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { PurgeService } from '@mm-services/purge.service';
import { DbService } from '@mm-services/db.service';

const bootstrapPurger = require('../../../../src/js/bootstrapper/purger');

import sinon from 'sinon';
import { of, throwError } from 'rxjs';
import { expect } from 'chai';

describe('Purge service', () => {
  let service:PurgeService;
  let db;
  let httpClient;
  let appendToPurgeList;

  beforeEach(() => {
    httpClient = { get: sinon.stub() };
    db = { get: sinon.stub() };
    appendToPurgeList = sinon.stub(bootstrapPurger, 'appendToPurgeList');
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: httpClient },
        { provide: DbService, useValue: db }
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
    expect(db.get.callCount).to.equal(0);
  });

  it('does not query a second time in the same session', async () => {
    const response = { purged_ids: [] };
    httpClient.get.withArgs('/purging/changes').returns(of(response));
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1);
    expect(db.get.callCount).to.equal(0);
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1); // still just 1
    expect(db.get.callCount).to.equal(0);
  });

  it('handles request errors', async () => {
    httpClient.get.withArgs('/purging/changes').returns(throwError(new Error('boom')));
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(1);
    expect(db.get.callCount).to.equal(0);
    // no error is thrown
  });

  it('updates to-purge list and writes checkpoint', async () => {
    const response = { purged_ids: ['a', 'b'], last_seq: 'xyz' };
    db.get.returns('notadb');
    httpClient.get
      .onCall(0).returns(of(response))
      .onCall(1).returns(of());
    appendToPurgeList.resolves();
    await service.updateDocsToPurge();
    expect(httpClient.get.callCount).to.equal(2);
    expect(httpClient.get.args[0][0]).to.equal('/purging/changes');
    expect(httpClient.get.args[1][0]).to.equal('/purging/checkpoint');
    expect(httpClient.get.args[1][1].params.seq).to.equal('xyz');
    expect(db.get.callCount).to.equal(1);
    expect(appendToPurgeList.callCount).to.equal(1);
    expect(appendToPurgeList.args[0][0]).to.equal('notadb');
    expect(appendToPurgeList.args[0][1]).to.deep.equal(['a', 'b']);
  });

});
