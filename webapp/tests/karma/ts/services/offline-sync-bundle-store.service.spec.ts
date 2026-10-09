import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { DbService } from '@mm-services/db.service';
import { OfflineSyncBundleStoreService } from '@mm-services/offline-sync-bundle-store.service';
import { OfflineSyncService } from '@mm-services/offline-sync.service';

describe('OfflineSyncBundleStore service', () => {
  const CHUNK_BYTES = 3 * 128 * 1024;
  const toBase64 = bytes => window.btoa(Array.from(bytes, byte => String.fromCodePoint(byte as number)).join(''));

  let service: OfflineSyncBundleStoreService;
  let dbService;
  let offlineSyncService;
  let bundlesDb;

  const received = (id, bytes = 4) => ({
    id,
    envelope: `envelope-${id}`,
    signature: `signature-${id}`,
    bytes,
  });

  beforeEach(() => {
    bundlesDb = {
      put: sinon.stub().resolves(),
      allDocs: sinon.stub().resolves({ rows: [] }),
    };
    dbService = { get: sinon.stub().returns(bundlesDb) };
    offlineSyncService = {
      receivedBundles: sinon.stub().returns([]),
      readBundle: sinon.stub().returns('AAAA'),
      deleteBundle: sinon.stub().returns(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: OfflineSyncService, useValue: offlineSyncService },
      ]
    });

    service = TestBed.inject(OfflineSyncBundleStoreService);
  });

  afterEach(() => sinon.restore());

  it('keeps bundles in a local database of their own', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);

    await service.collect();

    expect(dbService.get.args[0]).to.deep.equal([{ remote: false, bundles: true }]);
  });

  it('stores a received bundle with the envelope it must be sent on with', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);

    expect(await service.collect()).to.equal(1);
    const [doc] = bundlesDb.put.args[0];
    expect(doc._id).to.equal('bundle-1');
    expect(doc.envelope).to.equal('envelope-bundle-1');
    expect(doc.signature).to.equal('signature-bundle-1');
    expect(doc._attachments.payload.content_type).to.equal('application/octet-stream');
    expect(doc._attachments.payload.data).to.equal('AAAA');
  });

  it('pulls a large bundle back in pieces and joins them into the original bytes', async () => {
    const payload = new Uint8Array(2 * CHUNK_BYTES + 5).map((unused, index) => index % 251);
    offlineSyncService.receivedBundles.returns([received('bundle-1', payload.length)]);
    offlineSyncService.readBundle.callsFake(
      (unusedId, offset, length) => toBase64(payload.subarray(offset, offset + length))
    );

    await service.collect();

    expect(offlineSyncService.readBundle.args.map(([, offset]) => offset))
      .to.deep.equal([0, CHUNK_BYTES, 2 * CHUNK_BYTES]);
    const stored = window.atob(bundlesDb.put.args[0][0]._attachments.payload.data);
    expect(Array.from(stored, character => character.codePointAt(0))).to.deep.equal(Array.from(payload));
  });

  it('counts the bundles from the stored documents', async () => {
    bundlesDb.allDocs.resolves({ rows: [{ id: 'bundle-1' }, { id: 'bundle-2' }] });

    expect(await service.count()).to.equal(2);
  });

  it('drops the native copy only after the bundle is stored', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);

    await service.collect();

    expect(bundlesDb.put.calledBefore(offlineSyncService.deleteBundle)).to.be.true;
    expect(offlineSyncService.deleteBundle.args).to.deep.equal([['bundle-1']]);
  });

  it('takes a bundle that is already stored without failing', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1'), received('bundle-2')]);
    bundlesDb.put.onFirstCall().rejects({ status: 409 });

    await service.collect();

    expect(bundlesDb.put.callCount).to.equal(2);
    expect(offlineSyncService.deleteBundle.args).to.deep.equal([['bundle-1'], ['bundle-2']]);
  });

  it('starts a collection only once the one before it has finished', async () => {
    let finishFirstPut;
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);
    bundlesDb.put.onFirstCall().returns(new Promise(resolve => finishFirstPut = resolve));

    const first = service.collect();
    const second = service.collect();
    await new Promise(resolve => setTimeout(resolve));
    expect(offlineSyncService.receivedBundles.callCount).to.equal(1);

    finishFirstPut();
    await Promise.all([first, second]);
    expect(offlineSyncService.receivedBundles.callCount).to.equal(2);
  });

  it('still runs a collection after the one before it failed', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);
    bundlesDb.put.onFirstCall().rejects(new Error('unwritable'));

    await expect(service.collect()).to.be.rejectedWith(Error, 'unwritable');
    expect(await service.collect()).to.equal(1);
  });

  it('leaves the native copy alone when storing fails', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);
    bundlesDb.put.rejects(new Error('no space'));

    await expect(service.collect()).to.be.rejectedWith(Error, 'no space');
    expect(offlineSyncService.deleteBundle.notCalled).to.be.true;
  });

  it('reports a partly readable bundle as a code rather than storing it', async () => {
    offlineSyncService.receivedBundles.returns([received('bundle-1')]);
    offlineSyncService.readBundle.returns('');

    await expect(service.collect()).to.be.rejectedWith(Error, 'bundle_read_failed');
    expect(bundlesDb.put.notCalled).to.be.true;
  });
});
