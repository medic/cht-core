import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { OfflineSyncBundleStoreService } from '@mm-services/offline-sync-bundle-store.service';
import { OfflineSyncBundleUploadService } from '@mm-services/offline-sync-bundle-upload.service';

describe('OfflineSyncBundleUpload service', () => {
  const URL = '/api/v1/replication/data-bundle';

  let service: OfflineSyncBundleUploadService;
  let httpMock: HttpTestingController;
  let authService;
  let bundleStoreService;
  let dbSyncService;
  let syncListener;
  let payload;

  const stored = (id, receivedDate = 1) => ({
    _id: id,
    envelope: `envelope-${id}`,
    signature: `signature-${id}`,
    received_date: receivedDate,
  });

  const from = (id, user, receivedDate) => ({
    ...stored(id, receivedDate),
    envelope: btoa(JSON.stringify({ user, device_id: `${user}-phone`, payload_header_sha256: 'x' })),
  });

  beforeEach(() => {
    authService = { has: sinon.stub().resolves(true) };
    payload = new Blob(['ciphertext']);
    bundleStoreService = {
      collect: sinon.stub().resolves(),
      pending: sinon.stub().resolves([]),
      getPayload: sinon.stub().resolves(payload),
      remove: sinon.stub().resolves(),
      recordAttempt: sinon.stub().resolves(),
      markUndeliverable: sinon.stub().resolves(),
      markForbidden: sinon.stub().resolves(),
    };
    dbSyncService = { subscribe: sinon.stub().callsFake(listener => syncListener = listener) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: OfflineSyncBundleStoreService, useValue: bundleStoreService },
      ]
    });

    service = TestBed.inject(OfflineSyncBundleUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  const requestFor = async () => {
    let matches = httpMock.match(URL);
    for (let attempt = 0; !matches.length && attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      matches = httpMock.match(URL);
    }
    return matches[0];
  };

  const answer = async (status?: number) => {
    const request = await requestFor();
    if (!request) {
      throw new Error(`no request to ${URL}`);
    }
    if (status) {
      request.flush('nope', { status, statusText: 'rejected' });
    } else {
      request.flush({ ok: true });
    }
    return request;
  };

  it('sends nothing when it is carrying nothing', async () => {
    await service.deliverPending();

    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  it('passes the envelope and signature on untouched', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    const request = await answer();

    expect(request.request.headers.get('X-Medic-Bundle-Envelope')).to.equal('envelope-bundle-1');
    expect(request.request.headers.get('X-Medic-Bundle-Signature')).to.equal('signature-bundle-1');
    expect(request.request.headers.get('Content-Type')).to.equal('application/octet-stream');
    expect(request.request.body).to.equal(payload);
    await delivered;
  });

  it('drops a bundle once the server has it', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer();
    await delivered;

    expect(bundleStoreService.remove.args[0][0]._id).to.equal('bundle-1');
  });

  it('sends the oldest first', async () => {
    bundleStoreService.pending.resolves([stored('older', 100), stored('newer', 200)]);

    const delivered = service.deliverPending();
    await answer();
    await answer();
    await delivered;

    expect(bundleStoreService.remove.args.map(([doc]) => doc._id)).to.deep.equal(['older', 'newer']);
  });

  it('keeps a bundle the server could not take this time, without counting it against the bundle', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(503);
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
  });

  it('resumes an upload that was cut off, without counting it against the bundle', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    (await requestFor()).error(new ProgressEvent('error'));
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
    expect(bundleStoreService.markUndeliverable.notCalled).to.be.true;
  });

  it('holds a bundle whose sender may not send, without counting it, so it goes once permitted', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(403);
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
    expect(bundleStoreService.markUndeliverable.notCalled).to.be.true;
    expect(bundleStoreService.markForbidden.args.map(([doc]) => doc._id)).to.deep.equal(['bundle-1']);
  });

  it('keeps a bundle refused with a 400 and counts the refusal', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(400);
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.markUndeliverable.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.calledOnceWith(sinon.match({ _id: 'bundle-1' }), 1)).to.be.true;
  });

  it('stops offering a bundle the server has refused too many times, in one write', async () => {
    bundleStoreService.pending.resolves([{ ...stored('bundle-1'), attempts: 9 }]);

    const delivered = service.deliverPending();
    await answer(400);
    await delivered;

    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;

    expect(bundleStoreService.markUndeliverable.calledOnceWithExactly(sinon.match({ _id: 'bundle-1' }))).to.be.true;
    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  it('stops offering a bundle that is too large straight away', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(413);
    await delivered;

    expect(bundleStoreService.markUndeliverable.calledOnceWithExactly(sinon.match({ _id: 'bundle-1' }))).to.be.true;
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
  });

  it('never deletes a bundle the server did not take', async () => {
    bundleStoreService.pending.resolves([{ ...stored('bundle-1'), attempts: 9 }]);

    for (const status of [400, 413, 401, 403, 500]) {
      bundleStoreService.remove.resetHistory();
      const delivered = service.deliverPending();
      await answer(status);
      await delivered;

      expect(bundleStoreService.remove.notCalled, `deleted on ${status}`).to.be.true;
    }
  });

  it('stops at the first bundle it could not send', async () => {
    bundleStoreService.pending.resolves([stored('first', 100), stored('second', 200)]);

    const delivered = service.deliverPending();
    await answer(503);
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  it('holds the later bundles of a sender who may not send, and delivers everyone else\'s', async () => {
    const alice1 = from('alice-1', 'alice', 100);
    const bob1 = from('bob-1', 'bob', 150);
    bundleStoreService.pending.resolves([alice1, bob1, from('alice-2', 'alice', 200)]);

    const delivered = service.deliverPending();
    const first = await answer(403);
    const second = await answer();
    await delivered;

    expect(first.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(alice1.envelope);
    expect(second.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(bob1.envelope);
    expect(bundleStoreService.remove.args.map(([doc]) => doc._id)).to.deep.equal(['bob-1']);
  });

  it('holds only the refused sender\'s later bundles, and delivers everyone else\'s', async () => {
    const alice1 = from('alice-1', 'alice', 100);
    const bob1 = from('bob-1', 'bob', 150);
    bundleStoreService.pending.resolves([alice1, bob1, from('alice-2', 'alice', 200)]);

    const delivered = service.deliverPending();
    const first = await answer(400);
    const second = await answer();
    await delivered;

    expect(first.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(alice1.envelope);
    expect(second.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(bob1.envelope);
    expect(bundleStoreService.remove.args.map(([doc]) => doc._id)).to.deep.equal(['bob-1']);
  });

  it('holds only the sender of a bundle it cannot load, and delivers everyone else\'s', async () => {
    const consoleError = sinon.stub(console, 'error');
    bundleStoreService.pending.resolves([
      from('alice-1', 'alice', 100),
      from('bob-1', 'bob', 150),
      from('alice-2', 'alice', 200),
    ]);
    bundleStoreService.getPayload.withArgs('alice-1').rejects(new Error('missing attachment'));

    const delivered = service.deliverPending();
    const request = await answer();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(httpMock.match(URL)).to.be.empty;
    await delivered;

    expect(request.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(from('bob-1', 'bob', 150).envelope);
    expect(bundleStoreService.remove.args.map(([doc]) => doc._id)).to.deep.equal(['bob-1']);
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
    expect(bundleStoreService.markUndeliverable.notCalled).to.be.true;
    expect(consoleError.calledOnce).to.be.true;
  });

  it('stops the whole run when its own session is refused', async () => {
    bundleStoreService.pending.resolves([from('alice-1', 'alice', 100), from('bob-1', 'bob', 150)]);

    const delivered = service.deliverPending();
    await answer(401);
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
  });

  it('stops the whole run when the server is the problem, whoever sent the next bundle', async () => {
    bundleStoreService.pending.resolves([from('alice-1', 'alice', 100), from('bob-1', 'bob', 150)]);

    const delivered = service.deliverPending();
    await answer(503);
    await delivered;

    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
  });

  describe('against a real store', () => {
    let bundlesDb;
    let store: OfflineSyncBundleStoreService;
    let realService: OfflineSyncBundleUploadService;

    const keep = async (bundle, attempts = 0) => {
      await bundlesDb.put({
        ...bundle,
        attempts,
        _attachments: { payload: { content_type: 'application/octet-stream', data: btoa(`bytes-${bundle._id}`) } },
      });
    };

    const sentEnvelopes = (requests) => requests.map(request => request.request.headers.get('X-Medic-Bundle-Envelope'));

    beforeEach(() => {
      bundlesDb = new (require('pouchdb-browser').default)(`offline-sync-bundles-${Date.now()}`);
      store = new OfflineSyncBundleStoreService({ get: () => bundlesDb } as any, {} as any);
      realService = new OfflineSyncBundleUploadService(authService, store, dbSyncService, TestBed.inject(HttpClient));
    });

    afterEach(() => bundlesDb.destroy());

    it('sets a bundle aside on the last refusal it allows, and delivers what comes after it', async () => {
      const alice1 = from('alice-1', 'alice', 100);
      const bob1 = from('bob-1', 'bob', 150);
      const alice2 = from('alice-2', 'alice', 200);
      await keep(alice1, 9);
      await keep(bob1);
      await keep(alice2);

      const delivered = realService.deliverPending();
      const requests = [await answer(400), await answer(), await answer()];
      await delivered;

      expect(sentEnvelopes(requests)).to.deep.equal([alice1.envelope, bob1.envelope, alice2.envelope]);
      expect(await store.counts()).to.deep.equal({ waiting: 0, undeliverable: 1, forbidden: false });
    });

    it('still sends the bytes it stored after the server has refused them more than once', async () => {
      await keep(from('alice-1', 'alice', 100));

      for (const status of [403, 400]) {
        const run = realService.deliverPending();
        await answer(status);
        await run;
      }
      const delivered = realService.deliverPending();
      const request = await answer();
      await delivered;

      expect(await (request.request.body as Blob).text()).to.equal('bytes-alice-1');
      expect(await store.counts()).to.deep.equal({ waiting: 0, undeliverable: 0, forbidden: false });
    });

    for (const [status, attempts] of [[413, 0], [400, 9]]) {
      it(`keeps the bytes of a bundle it has set aside after a ${status}`, async () => {
        await keep(from('alice-1', 'alice', 100), attempts);

        const delivered = realService.deliverPending();
        await answer(status);
        await delivered;

        expect(await store.counts()).to.deep.equal({ waiting: 0, undeliverable: 1, forbidden: false });
        expect(await (await store.getPayload('alice-1')).text()).to.equal('bytes-alice-1');
      });
    }
  });

  describe('on sync', () => {
    const sync = async (status) => {
      service.init();
      await syncListener(status);
    };

    it('delivers once the upward half of a sync has worked', async () => {
      bundleStoreService.pending.resolves([stored('bundle-1')]);

      const done = sync({ to: SyncStatus.Success });
      await answer();
      await done;

      expect(bundleStoreService.remove.args[0][0]._id).to.equal('bundle-1');
    });

    it('takes anything waiting on the native side before delivering', async () => {
      await sync({ to: SyncStatus.Success });

      expect(bundleStoreService.collect.calledBefore(bundleStoreService.pending)).to.be.true;
    });

    it('does nothing when the sync did not get through', async () => {
      await sync({ to: SyncStatus.Required });

      expect(bundleStoreService.pending.notCalled).to.be.true;
    });

    it('does nothing for a user who may not relay', async () => {
      authService.has.resolves(false);

      await sync({ to: SyncStatus.Success });

      expect(bundleStoreService.pending.notCalled).to.be.true;
    });

    it('never lets a delivery failure break syncing', async () => {
      bundleStoreService.pending.rejects(new Error('database gone'));

      await sync({ to: SyncStatus.Success });
    });
  });
});
