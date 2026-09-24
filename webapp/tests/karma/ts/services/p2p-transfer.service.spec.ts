import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';

import { OfflineDataBundleService } from '@mm-services/offline-data-bundle.service';
import { P2pService } from '@mm-services/p2p.service';
import { P2pTransferService } from '@mm-services/p2p-transfer.service';

describe('P2pTransfer service', () => {
  const CHUNK_BYTES = 3 * 128 * 1024;

  let service: P2pTransferService;
  let bundleService;
  let p2pService;
  let transfers;

  const bundle = (seq, bytes = 8) => ({
    envelope: `envelope-${seq}`,
    signature: `signature-${seq}`,
    ciphertext: new Uint8Array(bytes),
    lastSeq: seq,
    docCount: 1,
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
    p2pService = {
      openBundle: sinon.stub().returns('transfer-1'),
      writeBundle: sinon.stub().returns(true),
      sendBundle: sinon.stub().callsFake(() => transfers.next({ ok: true, detail: '' })),
      transferResult: sinon.stub().returns(transfers.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: OfflineDataBundleService, useValue: bundleService },
        { provide: P2pService, useValue: p2pService },
      ]
    });

    service = TestBed.inject(P2pTransferService);
  });

  afterEach(() => sinon.restore());

  it('packs from the position the scope asks for', async () => {
    await service.handOver('sync');

    expect(bundleService.getPosition.args).to.deep.equal([['sync']]);
    expect(bundleService.packBundles.args).to.deep.equal([[7]]);
  });

  it('hands each bundle over with the envelope it was sealed with', async () => {
    bundleService.packBundles = packing([bundle(1), bundle(2)]);

    expect(await service.handOver('export')).to.equal(2);
    expect(p2pService.sendBundle.args).to.deep.equal([
      ['transfer-1', 'envelope-1', 'signature-1'],
      ['transfer-1', 'envelope-2', 'signature-2'],
    ]);
  });

  // The position is what a later transfer resumes from, so it may only ever cover bundles the
  // host actually took.
  it('records each bundle as exported only once the host has taken it', async () => {
    bundleService.packBundles = packing([bundle(11), bundle(22)]);

    await service.handOver('export');

    expect(bundleService.recordExported.args).to.deep.equal([[11], [22]]);
  });

  it('stops at the first bundle the host refuses, and does not record it', async () => {
    bundleService.packBundles = packing([bundle(11), bundle(22)]);
    p2pService.sendBundle.callsFake(() => transfers.next({ ok: false, detail: 'host_unreachable' }));

    await expect(service.handOver('export')).to.be.rejectedWith(Error, 'host_unreachable');
    expect(bundleService.recordExported.notCalled).to.be.true;
  });

  it('reports a failure to open native storage as a code', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    p2pService.openBundle.returns(null);

    await expect(service.handOver('export')).to.be.rejectedWith(Error, 'bundle_open_failed');
    expect(p2pService.sendBundle.notCalled).to.be.true;
  });

  it('reports a failure to write as a code, and sends nothing', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    p2pService.writeBundle.returns(false);

    await expect(service.handOver('export')).to.be.rejectedWith(Error, 'bundle_write_failed');
    expect(p2pService.sendBundle.notCalled).to.be.true;
  });

  it('pushes a large bundle across in pieces', async () => {
    bundleService.packBundles = packing([bundle(1, 2 * CHUNK_BYTES + 1)]);

    await service.handOver('export');

    expect(p2pService.writeBundle.callCount).to.equal(3);
  });

  it('sends nothing when nothing has changed', async () => {
    expect(await service.handOver('export')).to.equal(0);
    expect(p2pService.openBundle.notCalled).to.be.true;
  });
});
