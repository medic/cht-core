import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';

import { OfflineDataBundleService } from '@mm-services/offline-data-bundle.service';
import { OfflineSyncService } from '@mm-services/offline-sync.service';
import { OfflineSyncTransferService } from '@mm-services/offline-sync-transfer.service';

describe('OfflineSyncTransfer service', () => {
  const CHUNK_BYTES = 3 * 128 * 1024;

  let service: OfflineSyncTransferService;
  let bundleService;
  let offlineSyncService;
  let transfers;

  const bundle = (seq, bytes = 8) => ({
    envelope: `envelope-${seq}`,
    signature: `signature-${seq}`,
    ciphertext: new Uint8Array(bytes),
    lastSeq: seq,
    skipped: 0,
  });

  const packing = (bundles) => sinon.stub().returns((async function* () {
    yield* bundles;
  })());

  beforeEach(() => {
    transfers = new Subject();
    bundleService = {
      getPosition: sinon.stub().returns(7),
      packBundles: packing([]),
      recordExported: sinon.stub(),
    };
    offlineSyncService = {
      abortBundle: sinon.stub(),
      transferStarted: sinon.stub(),
      transferProgress: sinon.stub(),
      transferFinished: sinon.stub(),
      openBundle: sinon.stub().returns('transfer-1'),
      writeBundle: sinon.stub().returns(true),
      sendBundle: sinon.stub().callsFake(() => transfers.next({ ok: true, detail: '' })),
      transferResult: sinon.stub().returns(transfers.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: OfflineDataBundleService, useValue: bundleService },
        { provide: OfflineSyncService, useValue: offlineSyncService },
      ]
    });

    service = TestBed.inject(OfflineSyncTransferService);
  });

  afterEach(() => sinon.restore());

  it('packs from the position the scope asks for', async () => {
    await service.handOver('sync');

    expect(bundleService.getPosition.args).to.deep.equal([['sync']]);
    expect(bundleService.packBundles.args).to.deep.equal([[7]]);
  });

  it('hands each bundle over with the envelope it was sealed with', async () => {
    bundleService.packBundles = packing([bundle(1), bundle(2)]);

    expect((await service.handOver('export')).delivered).to.equal(2);
    expect(offlineSyncService.sendBundle.args).to.deep.equal([
      ['transfer-1', 'envelope-1', 'signature-1'],
      ['transfer-1', 'envelope-2', 'signature-2'],
    ]);
  });

  it('records each bundle as exported only once the host has taken it', async () => {
    bundleService.packBundles = packing([bundle(11), bundle(22)]);

    await service.handOver('export');

    expect(bundleService.recordExported.args).to.deep.equal([[11], [22]]);
  });

  it('stops at the first bundle the host refuses, and does not record it', async () => {
    bundleService.packBundles = packing([bundle(11), bundle(22)]);
    offlineSyncService.sendBundle.callsFake(() => transfers.next({ ok: false, detail: 'host_unreachable' }));

    await expect(service.handOver('export')).to.be.rejectedWith(Error, 'host_unreachable');
    expect(bundleService.recordExported.notCalled).to.be.true;
  });

  it('reports a failure to open native storage as a code', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    offlineSyncService.openBundle.returns(null);

    await expect(service.handOver('export')).to.be.rejectedWith(Error, 'bundle_open_failed');
    expect(offlineSyncService.sendBundle.notCalled).to.be.true;
  });

  it('reports a failure to write as a code, and sends nothing', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    offlineSyncService.writeBundle.returns(false);

    await expect(service.handOver('export')).to.be.rejectedWith(Error, 'bundle_write_failed');
    expect(offlineSyncService.sendBundle.notCalled).to.be.true;
  });

  it('drops a bundle it could not finish writing', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    offlineSyncService.writeBundle.returns(false);

    await service.handOver('export').catch(() => {});

    expect(offlineSyncService.abortBundle.args).to.deep.equal([['transfer-1']]);
  });

  it('holds the session open across the whole handover, not each bundle', async () => {
    bundleService.packBundles = packing([bundle(1), bundle(2)]);

    await service.handOver('export');

    expect(offlineSyncService.transferStarted.callCount).to.equal(1);
    expect(offlineSyncService.transferProgress.args).to.deep.equal([[1], [2]]);
    expect(offlineSyncService.transferFinished.args).to.deep.equal([[true]]);
  });

  it('says the handover failed rather than just going quiet', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    offlineSyncService.sendBundle.callsFake(() => transfers.next({ ok: false, detail: 'host_unreachable' }));

    await service.handOver('export').catch(() => {});

    expect(offlineSyncService.transferFinished.args).to.deep.equal([[false]]);
  });

  it('pushes a large bundle across in pieces', async () => {
    bundleService.packBundles = packing([bundle(1, 2 * CHUNK_BYTES + 1)]);

    await service.handOver('export');

    expect(offlineSyncService.writeBundle.callCount).to.equal(3);
  });

  it('reports documents too large to send, without sending anything for them', async () => {
    bundleService.packBundles = packing([
      { envelope: '', signature: '', ciphertext: new Uint8Array(), lastSeq: 9, skipped: 2 },
    ]);

    const result = await service.handOver('export');

    expect(result).to.deep.equal({ delivered: 0, skipped: 2 });
    expect(offlineSyncService.openBundle.notCalled).to.be.true;
    expect(bundleService.recordExported.args).to.deep.equal([[9]]);
  });

  it('sends nothing when nothing has changed', async () => {
    expect((await service.handOver('export')).delivered).to.equal(0);
    expect(offlineSyncService.openBundle.notCalled).to.be.true;
  });

  it('does not open a session it has nothing to put in', async () => {
    await service.handOver('export');

    expect(offlineSyncService.transferStarted.notCalled).to.be.true;
    expect(offlineSyncService.transferFinished.notCalled).to.be.true;
  });

  it('does not open a session when there is nothing to pack from', async () => {
    bundleService.packBundles = sinon.stub().returns({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(new Error('device_not_registered')),
      }),
    });

    await service.handOver('export').catch(() => {});

    expect(offlineSyncService.transferStarted.notCalled).to.be.true;
    expect(offlineSyncService.transferFinished.notCalled).to.be.true;
  });
});
