import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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

  // A bundle with a real envelope, as a CHW device writes one: base64 of the utf8 json.
  const from = (id, user, receivedDate) => ({
    ...stored(id, receivedDate),
    envelope: btoa(JSON.stringify({ user, device_id: `${user}-phone`, payload_header_sha256: 'x' })),
  });

  beforeEach(() => {
    authService = { has: sinon.stub().resolves(true) };
    payload = new Blob(['ciphertext']);
    bundleStoreService = {
      collect: sinon.stub().resolves(0),
      pending: sinon.stub().resolves([]),
      getPayload: sinon.stub().resolves(payload),
      remove: sinon.stub().resolves(),
      recordAttempt: sinon.stub().resolves(1),
      markUndeliverable: sinon.stub().resolves(),
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

  /**
   * Answers the one request the test expects, so the caller's promise settles.
   *
   * Waits for the request to be made first: the bundle's bytes are read before it is sent, so it
   * takes more than one turn of the loop to reach the wire.
   */
  const answer = async (status?: number) => {
    // Polled rather than waiting a fixed number of turns: how many awaits it takes to reach the
    // wire is an implementation detail, and a helper that encodes it would report a timing miss as
    // a missing request.
    let matches = httpMock.match(URL);
    for (let attempt = 0; !matches.length && attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve));
      matches = httpMock.match(URL);
    }
    const [request] = matches;
    if (status) {
      request.flush('nope', { status, statusText: 'rejected' });
    } else {
      request.flush({ ok: true });
    }
    return request;
  };

  it('sends nothing when it is carrying nothing', async () => {
    expect(await service.deliverPending()).to.equal(0);
  });

  // This device cannot read the bundle or check it: passing both parts on exactly as they arrived
  // is the whole job, and the server is the only party that can make sense of either.
  it('passes the envelope and signature on untouched', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    const request = await answer();

    expect(request.request.headers.get('X-Medic-Bundle-Envelope')).to.equal('envelope-bundle-1');
    expect(request.request.headers.get('X-Medic-Bundle-Signature')).to.equal('signature-bundle-1');
    expect(request.request.headers.get('Content-Type')).to.equal('application/octet-stream');
    // The bytes themselves, not the document that describes them.
    expect(request.request.body).to.equal(payload);
    expect(await delivered).to.equal(1);
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

    expect(await delivered).to.equal(2);
    expect(bundleStoreService.remove.args.map(([doc]) => doc._id)).to.deep.equal(['older', 'newer']);
  });

  // The server was unreachable or broke: the bundle is still good and is the only copy anyone has.
  it('keeps a bundle the server could not take this time', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(503);

    expect(await delivered).to.equal(0);
    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  /**
   * A 400 from this endpoint is eight different things, and several of them are an administrator
   * not having finished setting the CHW up. Discarding on the first one destroys health data that
   * nothing else holds a copy of.
   */
  it('keeps a bundle refused with a 400, because that may not be about the bundle', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(400);

    expect(await delivered).to.equal(0);
    expect(bundleStoreService.remove.notCalled).to.be.true;
    expect(bundleStoreService.markUndeliverable.notCalled).to.be.true;
    expect(bundleStoreService.recordAttempt.args).to.deep.equal([['bundle-1']]);
  });

  // Enough tries for someone to fix a permission, then it stops holding up everything behind it.
  it('stops offering a bundle the server has refused too many times', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);
    bundleStoreService.recordAttempt.resolves(10);

    const delivered = service.deliverPending();
    await answer(400);
    await delivered;

    expect(bundleStoreService.markUndeliverable.args).to.deep.equal([['bundle-1', 400]]);
    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  // It is over the size limit and will not shrink, so there is nothing to wait for.
  it('stops offering a bundle that is too large straight away', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(413);
    await delivered;

    expect(bundleStoreService.markUndeliverable.args).to.deep.equal([['bundle-1', 413]]);
    expect(bundleStoreService.recordAttempt.notCalled).to.be.true;
  });

  // Nothing this device does may destroy a bundle except the server confirming it has it.
  it('never deletes a bundle the server did not take', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);
    bundleStoreService.recordAttempt.resolves(10);

    for (const status of [400, 413, 401, 403, 500]) {
      bundleStoreService.remove.resetHistory();
      const delivered = service.deliverPending();
      await answer(status);
      await delivered;

      expect(bundleStoreService.remove.notCalled, `deleted on ${status}`).to.be.true;
    }
  });

  // Bundles from one device are a sequence, so a later one must not overtake an earlier one that
  // is still waiting to go.
  it('stops at the first bundle it could not send', async () => {
    bundleStoreService.pending.resolves([stored('first', 100), stored('second', 200)]);

    const delivered = service.deliverPending();
    await answer(503);

    expect(await delivered).to.equal(0);
    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  /**
   * One CHW's refused bundle is about that CHW. Holding everyone else's behind it would let a single
   * misconfigured user stop a relay delivering for the whole area.
   */
  it('holds only the refused sender\'s later bundles, and delivers everyone else\'s', async () => {
    const alice1 = from('alice-1', 'alice', 100);
    const bob1 = from('bob-1', 'bob', 150);
    bundleStoreService.pending.resolves([alice1, bob1, from('alice-2', 'alice', 200)]);

    const delivered = service.deliverPending();
    const first = await answer(400);
    const second = await answer();

    expect(await delivered).to.equal(1);
    expect(first.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(alice1.envelope);
    expect(second.request.headers.get('X-Medic-Bundle-Envelope')).to.equal(bob1.envelope);
    expect(bundleStoreService.remove.args.map(([doc]) => doc._id)).to.deep.equal(['bob-1']);
  });

  // This device's own session has gone: every bundle would be refused the same way.
  it('stops the whole run when its own session is refused', async () => {
    bundleStoreService.pending.resolves([from('alice-1', 'alice', 100), from('bob-1', 'bob', 150)]);

    const delivered = service.deliverPending();
    await answer(401);

    expect(await delivered).to.equal(0);
    expect(bundleStoreService.remove.notCalled).to.be.true;
  });

  // The server is down: trying the next sender would only spend that bundle's attempts too.
  it('stops the whole run when the server is the problem, whoever sent the next bundle', async () => {
    bundleStoreService.pending.resolves([from('alice-1', 'alice', 100), from('bob-1', 'bob', 150)]);

    const delivered = service.deliverPending();
    await answer(503);

    expect(await delivered).to.equal(0);
    expect(bundleStoreService.recordAttempt.args).to.deep.equal([['alice-1']]);
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

    // The screen that takes bundles off the native side only exists while it is open, so a
    // handover the supervisor walked away from would otherwise sit there for good.
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
