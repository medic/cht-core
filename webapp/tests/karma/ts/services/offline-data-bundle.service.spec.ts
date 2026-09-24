import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Decrypter, generateIdentity, identityToRecipient } from 'age-encryption';
import { ed25519 } from '@noble/curves/ed25519.js';

import { DbService } from '@mm-services/db.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { OfflineDataBundleService, SealedBundle } from '@mm-services/offline-data-bundle.service';
import { SessionService } from '@mm-services/session.service';

describe('OfflineDataBundle service', () => {
  const DEVICE_ID = 'device-1';
  const CHANGES_PAGE_SIZE = 100;

  let service: OfflineDataBundleService;
  let dbService;
  let dbSyncService;
  let deviceKeyService;
  let sessionService;
  let medicDb;
  let identity;
  let signingPrivateKey;

  beforeEach(async () => {
    identity = await generateIdentity();
    signingPrivateKey = ed25519.utils.randomSecretKey();

    medicDb = { changes: sinon.stub() };
    dbService = { get: sinon.stub().returns(medicDb) };
    dbSyncService = { getLastReplicatedSeq: sinon.stub().returns(0) };
    sessionService = { userCtx: sinon.stub().returns({ name: 'chw-user' }) };
    deviceKeyService = {
      getKeyMaterial: sinon.stub().resolves({
        deviceId: DEVICE_ID,
        signingPrivateKey,
        serverEncryptionPublicKey: await identityToRecipient(identity),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: DeviceKeyService, useValue: deviceKeyService },
        { provide: SessionService, useValue: sessionService },
      ]
    });

    service = TestBed.inject(OfflineDataBundleService);
  });

  afterEach(() => {
    window.localStorage.removeItem('medic-last-exported-seq');
    window.localStorage.removeItem('medic-last-bundle-seq');
    sinon.restore();
  });

  /** One page of changes. Short pages are what tell the service it has reached the end. */
  const onePageOf = (docs, startSeq = 0) => ({
    last_seq: startSeq + docs.length,
    results: docs.map((doc, index) => ({ seq: startSeq + index + 1, id: doc._id, doc })),
  });

  const collect = async (sinceSeq: any = 0): Promise<SealedBundle[]> => {
    const bundles: SealedBundle[] = [];
    for await (const bundle of service.packBundles(sinceSeq)) {
      bundles.push(bundle);
    }
    return bundles;
  };

  const openEnvelope = (bundle: SealedBundle) => JSON.parse(atob(bundle.envelope));

  const openBundle = async (bundle: SealedBundle) => {
    const decrypter = new Decrypter();
    decrypter.addIdentity(identity);
    const plaintext = new TextDecoder().decode(await decrypter.decrypt(bundle.ciphertext));
    return plaintext.split('\n').filter(line => line.length).map(line => JSON.parse(line));
  };

  it('produces nothing when nothing has changed', async () => {
    medicDb.changes.resolves(onePageOf([]));

    expect(await collect()).to.deep.equal([]);
  });

  it('refuses to pack when the device has no keys', async () => {
    deviceKeyService.getKeyMaterial.resolves(null);

    await expect(collect()).to.be.rejectedWith(Error, 'device_not_registered');
  });

  it('refuses to pack when the session cannot name the user', async () => {
    sessionService.userCtx.returns(undefined);

    await expect(collect()).to.be.rejectedWith(Error, 'device_not_registered');
  });

  // The whole wire contract in one test: what the server does with a bundle is decode the
  // envelope, verify the signature over those exact bytes, and decrypt the body. If any of the
  // three encodings drift, this fails.
  // Anything the screen can be handed has to be a code, because it becomes a translation key.
  it('fails with a code, never a sentence', async () => {
    deviceKeyService.getKeyMaterial.resolves(null);

    const failure = await collect().catch(err => err);

    expect(failure.message).to.match(/^[a-z0-9_]+$/);
  });

  it('seals a bundle the server can open, verify and read', async () => {
    const docs = [{ _id: 'contact-1', _rev: '1-a' }, { _id: 'report-1', _rev: '1-b' }];
    medicDb.changes.resolves(onePageOf(docs));

    const [bundle] = await collect();

    const envelopeBytes = Uint8Array.from(atob(bundle.envelope), character => character.codePointAt(0)!);
    const signature = Uint8Array.from(atob(bundle.signature), character => character.codePointAt(0)!);
    expect(ed25519.verify(signature, envelopeBytes, ed25519.getPublicKey(signingPrivateKey))).to.be.true;
    expect(JSON.parse(new TextDecoder().decode(envelopeBytes))).to.deep.equal({
      user: 'chw-user',
      device_id: DEVICE_ID,
      bundle_seq: 1,
    });
    expect(await openBundle(bundle)).to.deep.equal(docs);
  });

  // The envelope travels in front of a relay that must not learn anything about the CHW's data.
  it('tells the relay nothing beyond who sent the bundle and in what order', async () => {
    medicDb.changes.resolves(onePageOf([{ _id: 'contact-1', _rev: '1-a' }]));

    const [bundle] = await collect();

    expect(Object.keys(openEnvelope(bundle)).sort((a, b) => a.localeCompare(b))).to.deep.equal(['bundle_seq', 'device_id', 'user']);
  });

  // A relay orders bundles by this number and spots a gap with it, so two bundles from the same
  // device must never share one.
  it('numbers bundles across handovers, not within one', async () => {
    medicDb.changes.resolves(onePageOf([{ _id: 'a' }]));

    const [first] = await collect();
    const [second] = await collect();

    expect(openEnvelope(first).bundle_seq).to.equal(1);
    expect(openEnvelope(second).bundle_seq).to.equal(2);
  });

  // They come down from the server and are refused on the way back, so a bundle spent on one is a
  // bundle wasted. The same filter replication uses decides this, so the case covers the class.
  it('leaves out what replication would never send up', async () => {
    medicDb.changes.resolves(onePageOf([
      { _id: '_design/medic-client' },
      { _id: 'settings' },
      { _id: 'form:pregnancy', type: 'form' },
      { _id: 'report-1' },
    ]));

    const [bundle] = await collect();

    expect((await openBundle(bundle)).map(doc => doc._id)).to.deep.equal(['report-1']);
  });

  it('packs the docs in the order they changed', async () => {
    const docs = [{ _id: 'c' }, { _id: 'a' }, { _id: 'b' }];
    medicDb.changes.resolves(onePageOf(docs));

    const [bundle] = await collect();

    expect((await openBundle(bundle)).map(doc => doc._id)).to.deep.equal(['c', 'a', 'b']);
  });

  it('reads every page of the changes feed', async () => {
    const page = (start) => Array.from(
      { length: CHANGES_PAGE_SIZE }, (unused, index) => ({ _id: `doc-${start + index}` })
    );
    medicDb.changes.onFirstCall().resolves(onePageOf(page(0)));
    medicDb.changes.onSecondCall().resolves(onePageOf(page(CHANGES_PAGE_SIZE), CHANGES_PAGE_SIZE));
    medicDb.changes.onThirdCall().resolves(onePageOf([{ _id: 'last' }], 2 * CHANGES_PAGE_SIZE));

    const [bundle] = await collect();

    expect(bundle.docCount).to.equal(2 * CHANGES_PAGE_SIZE + 1);
    expect(medicDb.changes.callCount).to.equal(3);
    expect(medicDb.changes.args.map(([options]) => options.since))
      .to.deep.equal([0, CHANGES_PAGE_SIZE, 2 * CHANGES_PAGE_SIZE]);
  });

  it('starts reading from the position it is given', async () => {
    medicDb.changes.resolves(onePageOf([]));

    await collect('42');

    expect(medicDb.changes.args[0][0].since).to.equal('42');
  });

  it('splits into bundles a phone can carry, numbered so the relay can order them', async () => {
    const big = (id) => ({ _id: id, data: 'x'.repeat(5 * 1024 * 1024) });
    medicDb.changes.resolves(onePageOf([big('one'), big('two')]));

    const bundles = await collect();

    expect(bundles).to.have.lengthOf(2);
    expect(bundles.map(bundle => openEnvelope(bundle).bundle_seq)).to.deep.equal([1, 2]);
    expect(bundles.map(bundle => bundle.docCount)).to.deep.equal([1, 1]);
    expect((await openBundle(bundles[0])).map(doc => doc._id)).to.deep.equal(['one']);
    expect((await openBundle(bundles[1])).map(doc => doc._id)).to.deep.equal(['two']);
  });

  // The caller advances its marker to lastSeq, so a bundle must never claim ground it does not
  // cover: reporting the feed's end on the first of two bundles would skip the second on a
  // transfer that stopped in between.
  it('reports the position each bundle actually ends at', async () => {
    const big = (id) => ({ _id: id, data: 'x'.repeat(5 * 1024 * 1024) });
    medicDb.changes.resolves(onePageOf([big('one'), big('two')]));

    const bundles = await collect();

    expect(bundles.map(bundle => bundle.lastSeq)).to.deep.equal([1, 2]);
  });

  describe('positions', () => {
    it('packs a sync scope from as far as replication got', () => {
      dbSyncService.getLastReplicatedSeq.returns(17);

      expect(service.getPosition('sync')).to.equal(17);
    });

    it('packs an export scope from the last completed handover', () => {
      service.recordExported(9);

      expect(service.getPosition('export')).to.equal(9);
    });

    // Starting from zero would re-send the whole database, nearly all of which the server sent to
    // this device in the first place.
    it('falls back to the sync position for a device that has never exported', () => {
      dbSyncService.getLastReplicatedSeq.returns(17);

      expect(service.getPosition('export')).to.equal(17);
    });

    it('never moves the export position backwards', () => {
      service.recordExported(9);
      service.recordExported(4);

      expect(service.getPosition('export')).to.equal(9);
    });
  });
});
