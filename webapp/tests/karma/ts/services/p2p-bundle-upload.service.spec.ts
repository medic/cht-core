import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { P2pBundleStoreService } from '@mm-services/p2p-bundle-store.service';
import { P2pBundleUploadService } from '@mm-services/p2p-bundle-upload.service';

describe('P2pBundleUpload service', () => {
  const URL = '/api/v1/replication/data-bundle';

  let service: P2pBundleUploadService;
  let httpMock: HttpTestingController;
  let authService;
  let bundleStoreService;
  let dbSyncService;
  let syncListener;

  const stored = (id, receivedDate = 1) => ({
    _id: id,
    envelope: `envelope-${id}`,
    signature: `signature-${id}`,
    received_date: receivedDate,
  });

  beforeEach(() => {
    authService = { has: sinon.stub().resolves(true) };
    bundleStoreService = {
      pending: sinon.stub().resolves([]),
      getPayload: sinon.stub().resolves(new Blob(['ciphertext'])),
      remove: sinon.stub().resolves(),
    };
    dbSyncService = { subscribe: sinon.stub().callsFake(listener => syncListener = listener) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: P2pBundleStoreService, useValue: bundleStoreService },
      ]
    });

    service = TestBed.inject(P2pBundleUploadService);
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
    await new Promise(resolve => setTimeout(resolve));
    const request = httpMock.expectOne(URL);
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
    expect(await delivered).to.equal(1);
  });

  it('drops a bundle once the server has it', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer();
    await delivered;

    expect(bundleStoreService.remove.args).to.deep.equal([['bundle-1']]);
  });

  it('sends the oldest first', async () => {
    bundleStoreService.pending.resolves([stored('older', 100), stored('newer', 200)]);

    const delivered = service.deliverPending();
    await answer();
    await answer();

    expect(await delivered).to.equal(2);
    expect(bundleStoreService.remove.args).to.deep.equal([['older'], ['newer']]);
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
   * A bundle the server will refuse every time, most likely sealed to a key it has since replaced.
   * Keeping it would mean retrying it on every sync for as long as the phone lasts.
   */
  it('gives up on a bundle the server will never take', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(400);

    expect(await delivered).to.equal(1);
    expect(bundleStoreService.remove.args).to.deep.equal([['bundle-1']]);
  });

  it('gives up on a bundle the server says is too large', async () => {
    bundleStoreService.pending.resolves([stored('bundle-1')]);

    const delivered = service.deliverPending();
    await answer(413);
    await delivered;

    expect(bundleStoreService.remove.args).to.deep.equal([['bundle-1']]);
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

      expect(bundleStoreService.remove.args).to.deep.equal([['bundle-1']]);
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
