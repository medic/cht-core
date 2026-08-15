const chai = require('chai');
const sinon = require('sinon');

const db = require('../../../../src/db');
const auth = require('../../../../src/auth');
const age = require('../../../../src/services/offline-data-bundle/age');
const signing = require('../../../../src/services/offline-data-bundle/signing');
const serverKey = require('../../../../src/services/offline-data-bundle/server-key');
const bulkDocsService = require('../../../../src/services/replication/bulk-docs');

const service = require('../../../../src/services/offline-data-bundle/data-bundle');

const USER = 'chw1';
const DEVICE = 'device-a';
const USER_DOC_ID = `org.couchdb.user:${USER}`;
const CHECKPOINT_ID = `_local/offline-checkpoint:${USER}:${DEVICE}`;
// A stand-in for the device's Ed25519 signing public key JWK (verify is stubbed, so the exact
// contents do not matter - only that this object is the one handed to signing.verify).
const SIGNING_JWK = { kty: 'OKP', crv: 'Ed25519', x: 'device-a-pub' };
// A stand-in for the server's per-device signing PRIVATE key JWK (sign is stubbed too), so we can
// assert sealCheckpoint hands this exact object to signing.sign.
const SERVER_SIGNING_JWK = { kty: 'OKP', crv: 'Ed25519', x: 'server-pub', d: 'server-priv' };
const DEVICE_RECIPIENT = 'age1recipient';
// The sealed checkpoint token = base64 of whatever age.encrypt returns; stub encrypt to a known
// value so the returned `checkpoint` is deterministic.
const SEALED_CIPHERTEXT = Buffer.from('sealed-ciphertext');
const SEALED_TOKEN = SEALED_CIPHERTEXT.toString('base64');

// Stubs the two seal primitives (signing.sign, age.encrypt) so settleCheckpoint returns SEALED_TOKEN.
const stubSeal = () => {
  sinon.stub(signing, 'sign').resolves('c2ln'); // base64 signature, contents irrelevant here
  sinon.stub(age, 'encrypt').resolves(SEALED_CIPHERTEXT);
};

const notFound = () => {
  const err = new Error('missing');
  err.status = 404;
  return err;
};

const envelopeFor = (overrides = {}) => ({
  user: USER,
  device_id: DEVICE,
  bundle_seq: 1,
  start_seq: 0,
  end_seq: 5,
  ...overrides,
});

const bundleFor = (overrides = {}) => ({
  envelope: envelopeFor(overrides.envelope),
  payload: overrides.payload || Buffer.from('ciphertext').toString('base64'),
  signature: overrides.signature || Buffer.from('sig').toString('base64'),
});

const ndjson = (docs) => Buffer.from(docs.map(doc => JSON.stringify(doc)).join('\n'), 'utf8');

describe('offline-data-bundle data-bundle service', () => {
  let userDoc;

  beforeEach(() => {
    userDoc = {
      _id: USER_DOC_ID,
      keys_by_device: {
        [DEVICE]: {
          encryption_public_key: 'age1recipient',
          signing_public_key: SIGNING_JWK,
        },
      },
    };
  });

  afterEach(() => sinon.restore());

  it('ingests a valid bundle, writes allowed docs and advances the checkpoint', async () => {
    const docs = [{ _id: 'd1' }, { _id: 'd2' }];
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(db.medic, 'get').withArgs(CHECKPOINT_ID).rejects(notFound());
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').resolves(ndjson(docs));
    stubSeal();
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    sinon.stub(bulkDocsService, 'filterOfflineRequest').resolves(docs);
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true, id: 'd1' }, { ok: true, id: 'd2' }]);
    const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

    const { results } = await service.process([bundleFor()]);

    chai.expect(results).to.have.lengthOf(1);
    // the returned checkpoint is the SEALED token, not the raw number
    chai.expect(results[0]).to.deep.equal({
      user: USER,
      device_id: DEVICE,
      checkpoint: SEALED_TOKEN,
      accepted: 2,
      rejected: 0,
    });
    chai.expect(db.medic.bulkDocs.calledOnceWith(docs)).to.be.true;
    chai.expect(put.calledOnce).to.be.true;
    // the persisted _local checkpoint doc keeps the plain numeric seq
    chai.expect(put.args[0][0]).to.deep.equal({ _id: CHECKPOINT_ID, seq: 5 });

    // seal signs the inner {seq,user,device_id} bytes with the server signing key, then encrypts to
    // the device's age recipient.
    const expectedInner = Buffer.from(JSON.stringify({ seq: 5, user: USER, device_id: DEVICE }), 'utf8');
    chai.expect(signing.sign.calledOnce).to.be.true;
    chai.expect(signing.sign.args[0][0]).to.deep.equal(SERVER_SIGNING_JWK);
    chai.expect(Buffer.from(signing.sign.args[0][1]).equals(expectedInner)).to.be.true;
    chai.expect(age.encrypt.calledOnce).to.be.true;
    chai.expect(age.encrypt.args[0][0]).to.equal(DEVICE_RECIPIENT);
    // the signed envelope { checkpoint, signature } is what gets encrypted
    const signedEnvelope = JSON.parse(Buffer.from(age.encrypt.args[0][1]).toString('utf8'));
    chai.expect(signedEnvelope).to.deep.equal({
      checkpoint: { seq: 5, user: USER, device_id: DEVICE },
      signature: 'c2ln',
    });
  });

  it('passes the userCtx from getUserSettings into filterOfflineRequest', async () => {
    const docs = [{ _id: 'd1' }];
    const userCtx = { name: USER, roles: ['chw'], facility_id: ['f1'], contact_id: 'c1' };
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(db.medic, 'get').withArgs(CHECKPOINT_ID).rejects(notFound());
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').resolves(ndjson(docs));
    stubSeal();
    sinon.stub(auth, 'getUserSettings').resolves(userCtx);
    const filter = sinon.stub(bulkDocsService, 'filterOfflineRequest').resolves(docs);
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true, id: 'd1' }]);
    sinon.stub(db.medic, 'put').resolves({ ok: true });

    await service.process([bundleFor()]);

    chai.expect(auth.getUserSettings.calledOnceWith({ name: USER })).to.be.true;
    chai.expect(filter.calledOnceWith(userCtx, docs)).to.be.true;
  });

  it('verifies with the device signing key over canonical envelope + payload bytes, decrypts per-device',
    async () => {
      const docs = [{ _id: 'd1' }];
      sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
      sinon.stub(db.medic, 'get').withArgs(CHECKPOINT_ID).rejects(notFound());
      const verify = sinon.stub(signing, 'verify').resolves(true);
      const getServerPrivateKeys = sinon
        .stub(serverKey, 'getServerPrivateKeys')
        .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
      const decrypt = sinon.stub(age, 'decrypt').resolves(ndjson(docs));
      stubSeal();
      sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
      sinon.stub(bulkDocsService, 'filterOfflineRequest').resolves(docs);
      sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true, id: 'd1' }]);
      sinon.stub(db.medic, 'put').resolves({ ok: true });

      const payload = Buffer.from('ciphertext').toString('base64');
      await service.process([bundleFor({ payload })]);

      // stable, key-sorted envelope + raw payload bytes
      const canonical = '{"bundle_seq":1,"device_id":"device-a","end_seq":5,"start_seq":0,"user":"chw1"}';
      const payloadBytes = Buffer.from(payload, 'base64');
      const expectedMessage = Buffer.concat([Buffer.from(canonical, 'utf8'), payloadBytes]);
      chai.expect(verify.calledOnce).to.be.true;
      // the JWK signing_public_key is used, not a raw string
      chai.expect(verify.args[0][0]).to.deep.equal(SIGNING_JWK);
      chai.expect(Buffer.from(verify.args[0][2]).equals(expectedMessage)).to.be.true;
      // decryption uses the per-device server private identity from the vault (getServerPrivateKeys
      // is also called again by sealCheckpoint, hence calledWith rather than calledOnceWith)
      chai.expect(getServerPrivateKeys.calledWith(USER, DEVICE)).to.be.true;
      chai.expect(decrypt.args[0][0]).to.equal('AGE-SECRET-KEY-1');
      chai.expect(Buffer.from(decrypt.args[0][1]).equals(payloadBytes)).to.be.true;
    });

  it('rejects an invalid envelope without touching keys or the db', async () => {
    const get = sinon.stub(db.users, 'get');
    const verify = sinon.stub(signing, 'verify');

    // envelope missing the numeric sequence fields -> invalid
    const invalidBundle = {
      envelope: { user: USER, device_id: DEVICE },
      payload: Buffer.from('x').toString('base64'),
      signature: Buffer.from('s').toString('base64'),
    };
    const { results } = await service.process([invalidBundle]);

    chai.expect(results).to.deep.equal([{
      user: USER,
      device_id: DEVICE,
      bundle_seq: undefined,
      status: 'rejected',
      reason: 'invalid envelope',
    }]);
    chai.expect(get.called).to.be.false;
    chai.expect(verify.called).to.be.false;
  });

  it('rejects a bundle from an unknown device and does not ingest', async () => {
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves({
      _id: USER_DOC_ID,
      keys_by_device: { 'other-device': { signing_public_key: SIGNING_JWK } },
    });
    const verify = sinon.stub(signing, 'verify');
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');

    const { results } = await service.process([bundleFor()]);

    chai.expect(results).to.deep.equal([{
      user: USER,
      device_id: DEVICE,
      bundle_seq: 1,
      status: 'rejected',
      reason: 'unknown device',
    }]);
    chai.expect(verify.called).to.be.false;
    chai.expect(bulkDocs.called).to.be.false;
  });

  it('rejects a bundle with a bad signature and does not ingest', async () => {
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(signing, 'verify').resolves(false);
    const getServerPrivateKeys = sinon.stub(serverKey, 'getServerPrivateKeys');
    const decrypt = sinon.stub(age, 'decrypt');
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');

    const { results } = await service.process([bundleFor()]);

    chai.expect(results).to.deep.equal([{
      user: USER,
      device_id: DEVICE,
      bundle_seq: 1,
      status: 'rejected',
      reason: 'bad signature',
    }]);
    chai.expect(getServerPrivateKeys.called).to.be.false;
    chai.expect(decrypt.called).to.be.false;
    chai.expect(bulkDocs.called).to.be.false;
  });

  it('rejects when the server has no private key registered for the device', async () => {
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys').resolves(undefined);
    const decrypt = sinon.stub(age, 'decrypt');
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');

    const { results } = await service.process([bundleFor()]);

    chai.expect(results).to.deep.equal([{
      user: USER,
      device_id: DEVICE,
      bundle_seq: 1,
      status: 'rejected',
      reason: 'unknown device',
    }]);
    chai.expect(decrypt.called).to.be.false;
    chai.expect(bulkDocs.called).to.be.false;
  });

  it('rejects a corrupt payload that fails to parse as NDJSON', async () => {
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').resolves(Buffer.from('{not json', 'utf8'));
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');

    const { results } = await service.process([bundleFor()]);

    chai.expect(results).to.deep.equal([{
      user: USER,
      device_id: DEVICE,
      bundle_seq: 1,
      status: 'rejected',
      reason: 'corrupt payload',
    }]);
    chai.expect(bulkDocs.called).to.be.false;
  });

  it('rejects a payload that fails to decrypt', async () => {
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').rejects(new Error('no identity matched any of the file recipients'));
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs');

    const { results } = await service.process([bundleFor()]);

    chai.expect(results[0]).to.deep.equal({
      user: USER,
      device_id: DEVICE,
      bundle_seq: 1,
      status: 'rejected',
      reason: 'corrupt payload',
    });
    chai.expect(bulkDocs.called).to.be.false;
  });

  it('counts docs filtered out by authorization as rejected', async () => {
    const docs = [{ _id: 'd1' }, { _id: 'd2' }, { _id: 'd3' }];
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(db.medic, 'get').withArgs(CHECKPOINT_ID).rejects(notFound());
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').resolves(ndjson(docs));
    stubSeal();
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    sinon.stub(bulkDocsService, 'filterOfflineRequest').resolves([docs[0]]); // only one allowed
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true, id: 'd1' }]);
    sinon.stub(db.medic, 'put').resolves({ ok: true });

    const { results } = await service.process([bundleFor()]);

    chai.expect(results[0].accepted).to.equal(1);
    chai.expect(results[0].rejected).to.equal(2);
  });

  it('ingests all bundles but parks the checkpoint below a sequence gap', async () => {
    // bundles: [0->5] and [7->10]; 5..7 is a gap so checkpoint stops at 5.
    const docsA = [{ _id: 'a1' }];
    const docsC = [{ _id: 'c1' }];
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(db.medic, 'get').withArgs(CHECKPOINT_ID).rejects(notFound());
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt')
      .onFirstCall().resolves(ndjson(docsA))
      .onSecondCall().resolves(ndjson(docsC));
    stubSeal();
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    const filter = sinon.stub(bulkDocsService, 'filterOfflineRequest');
    filter.onFirstCall().resolves(docsA);
    filter.onSecondCall().resolves(docsC);
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }]);
    const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

    const { results } = await service.process([
      bundleFor({ envelope: { bundle_seq: 1, start_seq: 0, end_seq: 5 } }),
      bundleFor({ envelope: { bundle_seq: 3, start_seq: 7, end_seq: 10 } }),
    ]);

    // both bundles ingested (2 writes), single aggregated result, checkpoint parked at 5
    chai.expect(db.medic.bulkDocs.callCount).to.equal(2);
    chai.expect(results).to.have.lengthOf(1);
    // returned checkpoint is the sealed token; the parked-at-5 seq is verified via the persisted doc
    chai.expect(results[0].checkpoint).to.equal(SEALED_TOKEN);
    chai.expect(results[0].accepted).to.equal(2);
    chai.expect(put.args[0][0].seq).to.equal(5);
  });

  it('advances the checkpoint across a contiguous run from a stored checkpoint', async () => {
    const docs = [{ _id: 'x' }];
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(db.medic, 'get')
      .withArgs(CHECKPOINT_ID).resolves({ _id: CHECKPOINT_ID, _rev: '1-abc', seq: 5 });
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').resolves(ndjson(docs));
    stubSeal();
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    sinon.stub(bulkDocsService, 'filterOfflineRequest').resolves(docs);
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }]);
    const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

    const { results } = await service.process([
      bundleFor({ envelope: { bundle_seq: 3, start_seq: 8, end_seq: 12 } }), // out of order
      bundleFor({ envelope: { bundle_seq: 2, start_seq: 5, end_seq: 8 } }),
    ]);

    // returned checkpoint is the sealed token; the advanced-to-12 seq is verified via the persisted doc
    chai.expect(results[0].checkpoint).to.equal(SEALED_TOKEN);
    chai.expect(put.args[0][0]).to.deep.equal({ _id: CHECKPOINT_ID, _rev: '1-abc', seq: 12 });
  });

  it('isolates failures: one bad bundle does not stop a good one', async () => {
    const docs = [{ _id: 'good' }];
    sinon.stub(db.users, 'get').withArgs(USER_DOC_ID).resolves(userDoc);
    sinon.stub(db.medic, 'get').withArgs(CHECKPOINT_ID).rejects(notFound());
    const verify = sinon.stub(signing, 'verify');
    verify.onFirstCall().resolves(false); // first bundle (start 5) bad signature
    verify.onSecondCall().resolves(true); // second bundle (start 0) good
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: 'AGE-SECRET-KEY-1', signing: SERVER_SIGNING_JWK });
    sinon.stub(age, 'decrypt').resolves(ndjson(docs));
    stubSeal();
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    sinon.stub(bulkDocsService, 'filterOfflineRequest').resolves(docs);
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }]);
    const put = sinon.stub(db.medic, 'put').resolves({ ok: true });

    const { results } = await service.process([
      bundleFor({ envelope: { bundle_seq: 2, start_seq: 5, end_seq: 8 } }),
      bundleFor({ envelope: { bundle_seq: 1, start_seq: 0, end_seq: 5 } }),
    ]);

    const ingested = results.filter(r => r.checkpoint !== undefined);
    const rejections = results.filter(r => r.status === 'rejected');
    chai.expect(ingested).to.have.lengthOf(1);
    // returned checkpoint is the sealed token; the seq (stored 0 -> 0..5 contiguous; 5..8 bundle was
    // rejected) is verified via the persisted doc.
    chai.expect(ingested[0].checkpoint).to.equal(SEALED_TOKEN);
    chai.expect(put.args[0][0].seq).to.equal(5);
    chai.expect(rejections).to.have.lengthOf(1);
    chai.expect(rejections[0].reason).to.equal('bad signature');
  });
});
