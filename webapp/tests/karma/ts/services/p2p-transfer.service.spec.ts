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

  // Half a bundle is of no use to anyone, and the phone this runs on has little room to spare.
  it('drops a bundle it could not finish writing', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    p2pService.writeBundle.returns(false);

    await service.handOver('export').catch(() => {});

    expect(p2pService.abortBundle.args).to.deep.equal([['transfer-1']]);
  });

  // The native side holds the app alive for the length of the handover. Letting go between
  // bundles would give the system a chance to stop it half way through.
  it('holds the session open across the whole handover, not each bundle', async () => {
    bundleService.packBundles = packing([bundle(1), bundle(2)]);

    await service.handOver('export');

    expect(p2pService.transferStarted.callCount).to.equal(1);
    expect(p2pService.transferProgress.args).to.deep.equal([[1], [2]]);
    expect(p2pService.transferFinished.args).to.deep.equal([[true]]);
  });

  /** A user who switched to another app has only the notification to tell them it broke. */
  it('says the handover failed rather than just going quiet', async () => {
    bundleService.packBundles = packing([bundle(1)]);
    p2pService.sendBundle.callsFake(() => transfers.next({ ok: false, detail: 'host_unreachable' }));

    await service.handOver('export').catch(() => {});

    expect(p2pService.transferFinished.args).to.deep.equal([[false]]);
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

  // Asking the native side to hold a session open and then letting go before it has begun is not
  // something Android forgives: it kills the app.
  it('does not open a session it has nothing to put in', async () => {
    await service.handOver('export');

    expect(p2pService.transferStarted.notCalled).to.be.true;
    expect(p2pService.transferFinished.notCalled).to.be.true;
  });

  it('does not open a session when there is nothing to pack from', async () => {
    bundleService.packBundles = sinon.stub().returns((async function* () {
      throw new Error('device_not_registered');
    })());

    await service.handOver('export').catch(() => {});

    expect(p2pService.transferStarted.notCalled).to.be.true;
    expect(p2pService.transferFinished.notCalled).to.be.true;
  });
});
