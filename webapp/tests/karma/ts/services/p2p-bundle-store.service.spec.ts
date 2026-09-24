import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { DbService } from '@mm-services/db.service';
import { P2pBundleStoreService } from '@mm-services/p2p-bundle-store.service';
import { P2pService } from '@mm-services/p2p.service';

describe('P2pBundleStore service', () => {
  const CHUNK_BYTES = 3 * 128 * 1024;

  let service: P2pBundleStoreService;
  let dbService;
  let p2pService;
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
      get: sinon.stub().resolves(),
      remove: sinon.stub().resolves(),
      allDocs: sinon.stub().resolves({ rows: [] }),
      getAttachment: sinon.stub().resolves(),
    };
    dbService = { get: sinon.stub().returns(bundlesDb) };
    p2pService = {
      receivedBundles: sinon.stub().returns([]),
      readBundle: sinon.stub().returns('AAAA'),
      deleteBundle: sinon.stub().returns(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: P2pService, useValue: p2pService },
      ]
    });

    service = TestBed.inject(P2pBundleStoreService);
  });

  afterEach(() => sinon.restore());

  // These are another user's documents, encrypted to the server. Replicating them up as if they
  // were this user's own is exactly what must never happen.
  it('keeps bundles in a local database of their own', async () => {
    p2pService.receivedBundles.returns([received('bundle-1')]);

    await service.collect();

    expect(dbService.get.args[0]).to.deep.equal([{ remote: false, bundles: true }]);
  });

  it('stores a received bundle with the envelope it must be sent on with', async () => {
    p2pService.receivedBundles.returns([received('bundle-1')]);

    expect(await service.collect()).to.equal(1);
    const [doc] = bundlesDb.put.args[0];
    expect(doc._id).to.equal('bundle-1');
    expect(doc.envelope).to.equal('envelope-bundle-1');
    expect(doc.signature).to.equal('signature-bundle-1');
    expect(doc._attachments.payload.content_type).to.equal('application/octet-stream');
    expect(doc._attachments.payload.data).to.equal('AAAA');
  });

  it('pulls a large bundle back in pieces and joins them', async () => {
    p2pService.receivedBundles.returns([received('bundle-1', 2 * CHUNK_BYTES + 1)]);
    p2pService.readBundle.onFirstCall().returns('AAA');
    p2pService.readBundle.onSecondCall().returns('BBB');
    p2pService.readBundle.onThirdCall().returns('CCC');

    await service.collect();

    expect(p2pService.readBundle.args.map(([, offset]) => offset))
      .to.deep.equal([0, CHUNK_BYTES, 2 * CHUNK_BYTES]);
    expect(bundlesDb.put.args[0][0]._attachments.payload.data).to.equal('AAABBBCCC');
  });

  // Dropping the native copy before the store has it would lose a bundle nobody else holds.
  it('drops the native copy only after the bundle is stored', async () => {
    p2pService.receivedBundles.returns([received('bundle-1')]);

    await service.collect();

    expect(bundlesDb.put.calledBefore(p2pService.deleteBundle)).to.be.true;
    expect(p2pService.deleteBundle.args).to.deep.equal([['bundle-1']]);
  });

  it('leaves the native copy alone when storing fails', async () => {
    p2pService.receivedBundles.returns([received('bundle-1')]);
    bundlesDb.put.rejects(new Error('no space'));

    await expect(service.collect()).to.be.rejectedWith(Error, 'no space');
    expect(p2pService.deleteBundle.notCalled).to.be.true;
  });

  it('reports a partly readable bundle as a code rather than storing it', async () => {
    p2pService.receivedBundles.returns([received('bundle-1')]);
    p2pService.readBundle.returns('');

    await expect(service.collect()).to.be.rejectedWith(Error, 'bundle_read_failed');
    expect(bundlesDb.put.notCalled).to.be.true;
  });

  it('lists what is waiting, oldest first', async () => {
    bundlesDb.allDocs.resolves({ rows: [
      { doc: { _id: 'newer', received_date: 200 } },
      { doc: { _id: 'older', received_date: 100 } },
    ] });

    expect((await service.pending()).map(doc => doc._id)).to.deep.equal(['older', 'newer']);
  });

  it('removes a bundle that has been delivered', async () => {
    bundlesDb.get.resolves({ _id: 'bundle-1', _rev: '1-a' });

    await service.remove('bundle-1');

    expect(bundlesDb.remove.args).to.deep.equal([[{ _id: 'bundle-1', _rev: '1-a' }]]);
  });
});
