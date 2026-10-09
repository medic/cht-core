import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Decrypter, generateIdentity, identityToRecipient } from 'age-encryption';

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
  let signingKeyPair;

  beforeEach(async () => {
    identity = await generateIdentity();
    signingKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']
    );

    medicDb = { changes: sinon.stub() };
    dbService = { get: sinon.stub().returns(medicDb) };
    dbSyncService = { getLastReplicatedSeq: sinon.stub().returns(0) };
    sessionService = { userCtx: sinon.stub().returns({ name: 'chw-user' }) };
    deviceKeyService = {
      getKeyMaterial: sinon.stub().resolves({
        deviceId: DEVICE_ID,
        signingPrivateKey: signingKeyPair.privateKey,
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

  it('fails with a code, never a sentence', async () => {
    deviceKeyService.getKeyMaterial.resolves(null);

    const failure = await collect().catch(err => err);

    expect(failure.message).to.match(/^[a-z0-9_]+$/);
  });

  const ageHeaderHash = async (ciphertext) => {
    const text = new TextDecoder('utf8', { fatal: false }).decode(ciphertext.subarray(0, 400));
    const marker = text.indexOf('\n---');
    const end = text.indexOf('\n', marker + 1) + 1;
    const digest = await crypto.subtle.digest('SHA-256', ciphertext.subarray(0, end));
    return btoa(String.fromCharCode(...new Uint8Array(digest)));
  };

  it('seals a bundle the server can open, verify and read', async () => {
    const docs = [{ _id: 'contact-1', _rev: '1-a' }, { _id: 'report-1', _rev: '1-b' }];
    medicDb.changes.resolves(onePageOf(docs));

    const [bundle] = await collect();

    const envelopeBytes = Uint8Array.from(atob(bundle.envelope), character => character.codePointAt(0)!);
    const signature = Uint8Array.from(atob(bundle.signature), character => character.codePointAt(0)!);
    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, signingKeyPair.publicKey, signature, envelopeBytes
    );
    expect(verified, 'the api must be able to verify this signature').to.be.true;

    const envelope = JSON.parse(new TextDecoder().decode(envelopeBytes));
    expect(envelope).to.include({ user: 'chw-user', device_id: DEVICE_ID, bundle_seq: 1 });
    expect(envelope.payload_header_sha256).to.equal(await ageHeaderHash(bundle.ciphertext));
    expect(await openBundle(bundle)).to.deep.equal(docs);
  });

  it('tells the relay nothing beyond who sent the bundle and in what order', async () => {
    medicDb.changes.resolves(onePageOf([{ _id: 'contact-1', _rev: '1-a' }]));

    const [bundle] = await collect();

    expect(Object.keys(openEnvelope(bundle)).sort((a, b) => a.localeCompare(b)))
      .to.deep.equal(['bundle_seq', 'device_id', 'payload_header_sha256', 'user']);
  });

  it('numbers bundles across handovers, not within one', async () => {
    medicDb.changes.resolves(onePageOf([{ _id: 'a' }]));

    const [first] = await collect();
    const [second] = await collect();

    expect(openEnvelope(first).bundle_seq).to.equal(1);
    expect(openEnvelope(second).bundle_seq).to.equal(2);
  });

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

  it('asks for the attachment bytes, not the stubs', async () => {
    medicDb.changes.resolves(onePageOf([{ _id: 'report-1' }]));

    await collect();

    expect(medicDb.changes.args[0][0].attachments).to.be.true;
  });

  it('leaves out a document too large to fit a bundle, and says so', async () => {
    const huge = { _id: 'huge', data: 'x'.repeat(9 * 1024 * 1024) };
    medicDb.changes.resolves(onePageOf([huge, { _id: 'report-1' }]));

    const bundles = await collect();

    expect(bundles).to.have.lengthOf(1);
    expect(bundles[0].skipped).to.equal(1);
    expect((await openBundle(bundles[0])).map(doc => doc._id)).to.deep.equal(['report-1']);
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

    expect(await openBundle(bundle)).to.have.lengthOf(2 * CHANGES_PAGE_SIZE + 1);
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
    expect(await openBundle(bundles[0])).to.have.lengthOf(1);
    expect((await openBundle(bundles[0])).map(doc => doc._id)).to.deep.equal(['one']);
    expect((await openBundle(bundles[1])).map(doc => doc._id)).to.deep.equal(['two']);
  });

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
