const chai = require('chai');
const sinon = require('sinon');
const crypto = require('crypto');
const { Readable } = require('stream');
const { ReadableStream } = require('stream/web');

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
const SERVER_IDENTITY = 'AGE-SECRET-KEY-1SERVER';
const DEVICE_RECIPIENT = 'age1recipient';
// The sealed checkpoint token = base64 of whatever age.encrypt returns; stub encrypt to a known
// value so the returned `checkpoint` is deterministic.
const SEALED_CIPHERTEXT = Buffer.from('sealed-ciphertext');
const SEALED_TOKEN = SEALED_CIPHERTEXT.toString('base64');

const CIPHERTEXT = Buffer.from('an-age-ciphertext-payload');
const PAYLOAD_SHA256 = crypto.createHash('sha256').update(CIPHERTEXT).digest('base64');

const notFound = () => {
  const err = new Error('missing');
  err.status = 404;
  return err;
};

const ndjson = (docs) => Buffer.from(docs.map(doc => JSON.stringify(doc)).join('\n'), 'utf8');

const envelopeFor = (overrides = {}) => ({
  user: USER,
  device_id: DEVICE,
  bundle_seq: 1,
  start_seq: 0,
  end_seq: 5,
  payload_sha256: PAYLOAD_SHA256,
  payload_bytes: CIPHERTEXT.length,
  ...overrides,
});

// The body arrives as a Node stream, exactly like `req` does.
const bodyStream = (buffer = CIPHERTEXT) => Readable.from([buffer]);

// Stubs the two seal primitives (signing.sign, age.encrypt) so settleCheckpoint returns SEALED_TOKEN.
const stubSeal = () => {
  sinon.stub(signing, 'sign').resolves('c2ln'); // base64 signature, contents irrelevant here
  sinon.stub(age, 'encrypt').resolves(SEALED_CIPHERTEXT);
};

// Drains the ciphertext stream (so the sha256 tap actually sees the bytes, like age would) and
// then hands back the decrypted NDJSON as a web stream.
const webStream = (chunks) => new ReadableStream({
  start: (controller) => {
    chunks.forEach(chunk => controller.enqueue(new Uint8Array(chunk)));
    controller.close();
  },
});

const drain = async (stream) => {
  const reader = stream.getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) {
      return;
    }
  }
};

const stubDecryptStream = (plaintext) => {
  return sinon.stub(age, 'decryptStream').callsFake(async (identity, cipherStream) => {
    await drain(cipherStream);
    return webStream([plaintext]);
  });
};

const expectRejection = async (promise, code, message) => {
  try {
    await promise;
  } catch (err) {
    chai.expect(err.code).to.equal(code);
    chai.expect(err.message).to.equal(message);
    return err;
  }
  return chai.expect.fail(`expected a ${code} rejection`);
};

describe('offline-data-bundle data-bundle service', () => {
  let userDoc;

  beforeEach(() => {
    userDoc = {
      _id: USER_DOC_ID,
      keys_by_device: {
        [DEVICE]: { signing_public_key: SIGNING_JWK, encryption_public_key: DEVICE_RECIPIENT },
      },
    };
    sinon.stub(db.users, 'get').resolves(userDoc);
    sinon.stub(serverKey, 'getServerPrivateKeys')
      .resolves({ encryption: SERVER_IDENTITY, signing: SERVER_SIGNING_JWK });
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(db.medic, 'get').rejects(notFound());
    sinon.stub(db.medic, 'put').resolves({ ok: true });
    sinon.stub(db.medic, 'bulkDocs').resolves([]);
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    sinon.stub(bulkDocsService, 'filterOfflineRequest').callsFake((userCtx, docs) => Promise.resolve(docs));
    stubSeal();
  });

  afterEach(() => sinon.restore());

  describe('envelope validation', () => {
    const required = [
      'user', 'device_id', 'bundle_seq', 'start_seq', 'end_seq', 'payload_sha256', 'payload_bytes'
    ];

    required.forEach(field => {
      it(`rejects an envelope missing ${field}`, async () => {
        const envelope = envelopeFor();
        delete envelope[field];
        await expectRejection(service.process(envelope, 'sig', bodyStream()), 400, 'Invalid envelope.');
      });
    });

    it('rejects a missing envelope', async () => {
      await expectRejection(service.process(null, 'sig', bodyStream()), 400, 'Invalid envelope.');
    });

    it('does not touch the body when the envelope is invalid', async () => {
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(service.process({}, 'sig', bodyStream()), 400, 'Invalid envelope.');
      chai.expect(decryptStream.called).to.be.false;
    });
  });

  describe('device resolution', () => {
    it('rejects when the user doc does not exist', async () => {
      db.users.get.rejects(notFound());
      await expectRejection(service.process(envelopeFor(), 'sig', bodyStream()), 403, 'Unknown device.');
    });

    it('rejects when the device has no registered keys', async () => {
      userDoc.keys_by_device = {};
      await expectRejection(service.process(envelopeFor(), 'sig', bodyStream()), 403, 'Unknown device.');
    });

    it('rejects when the server holds no private key for the device', async () => {
      serverKey.getServerPrivateKeys.resolves(null);
      await expectRejection(service.process(envelopeFor(), 'sig', bodyStream()), 403, 'Unknown device.');
    });

    it('propagates an unexpected error reading the user doc', async () => {
      db.users.get.rejects(new Error('couch is down'));
      await chai.expect(service.process(envelopeFor(), 'sig', bodyStream())).to.be.rejectedWith('couch is down');
    });
  });

  describe('signature', () => {
    it('verifies over the canonical envelope alone, with the device signing key', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const envelope = envelopeFor();
      await service.process(envelope, 'the-signature', bodyStream());

      chai.expect(signing.verify.callCount).to.equal(1);
      const [key, signature, message] = signing.verify.args[0];
      chai.expect(key).to.deep.equal(SIGNING_JWK);
      chai.expect(signature).to.equal('the-signature');
      // canonical form = key-sorted JSON of the envelope, and nothing else
      chai.expect(message.toString('utf8')).to.equal(JSON.stringify({
        bundle_seq: 1,
        device_id: DEVICE,
        end_seq: 5,
        payload_bytes: CIPHERTEXT.length,
        payload_sha256: PAYLOAD_SHA256,
        start_seq: 0,
        user: USER,
      }));
    });

    it('rejects a bad signature without reading the body', async () => {
      signing.verify.resolves(false);
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(service.process(envelopeFor(), 'sig', bodyStream()), 403, 'Bad signature.');
      chai.expect(decryptStream.called).to.be.false;
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });
  });

  describe('payload', () => {
    it('rejects when decryption fails', async () => {
      sinon.stub(age, 'decryptStream').rejects(new Error('no identity matched'));
      await expectRejection(service.process(envelopeFor(), 'sig', bodyStream()), 400, 'Corrupt payload.');
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('rejects when the payload is not valid NDJSON', async () => {
      stubDecryptStream(Buffer.from('{not json}', 'utf8'));
      await expectRejection(service.process(envelopeFor(), 'sig', bodyStream()), 400, 'Corrupt payload.');
    });

    it('rejects when the body digest does not match the envelope', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const envelope = envelopeFor({ payload_sha256: crypto.createHash('sha256').update('other').digest('base64') });
      await expectRejection(
        service.process(envelope, 'sig', bodyStream()),
        400,
        'Payload does not match the envelope.'
      );
      chai.expect(db.medic.bulkDocs.called).to.be.false;
      chai.expect(db.medic.put.called).to.be.false;
    });

    it('rejects when the body length does not match the envelope', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(
        service.process(envelopeFor({ payload_bytes: 3 }), 'sig', bodyStream()),
        400,
        'Payload does not match the envelope.'
      );
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('decrypts with the server private key for this device', async () => {
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(envelopeFor(), 'sig', bodyStream());
      chai.expect(serverKey.getServerPrivateKeys.args[0]).to.deep.equal([USER, DEVICE]);
      chai.expect(decryptStream.args[0][0]).to.equal(SERVER_IDENTITY);
    });

    it('parses NDJSON lines that straddle stream chunks', async () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
      const bytes = ndjson(docs);
      // split mid-line so the carry buffer has to stitch the pieces back together
      sinon.stub(age, 'decryptStream').callsFake(async (identity, cipherStream) => {
        await drain(cipherStream);
        return webStream([bytes.subarray(0, 7), bytes.subarray(7, 20), bytes.subarray(20)]);
      });

      await service.process(envelopeFor(), 'sig', bodyStream());
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal(docs);
    });

    it('ignores blank lines', async () => {
      stubDecryptStream(Buffer.from('{"_id":"a"}\n\n{"_id":"b"}\n', 'utf8'));
      await service.process(envelopeFor(), 'sig', bodyStream());
      chai.expect(db.medic.bulkDocs.args[0][0]).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);
    });
  });

  describe('ingest', () => {
    it('authorizes as the peer, not the relaying user', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(envelopeFor(), 'sig', bodyStream());
      chai.expect(auth.getUserSettings.args[0]).to.deep.equal([{ name: USER }]);
      chai.expect(bulkDocsService.filterOfflineRequest.args[0][0]).to.deep.equal({ name: USER, roles: ['chw'] });
    });

    it('filters the whole doc set in a single call', async () => {
      const docs = Array.from({ length: 250 }, (unused, i) => ({ _id: `doc-${i}` }));
      stubDecryptStream(ndjson(docs));
      await service.process(envelopeFor(), 'sig', bodyStream());

      chai.expect(bulkDocsService.filterOfflineRequest.callCount).to.equal(1);
      chai.expect(bulkDocsService.filterOfflineRequest.args[0][1]).to.have.length(250);
    });

    it('writes in batches of 100 with new_edits false', async () => {
      const docs = Array.from({ length: 250 }, (unused, i) => ({ _id: `doc-${i}` }));
      stubDecryptStream(ndjson(docs));
      const result = await service.process(envelopeFor(), 'sig', bodyStream());

      chai.expect(db.medic.bulkDocs.callCount).to.equal(3);
      chai.expect(db.medic.bulkDocs.args.map(args => args[0].length)).to.deep.equal([100, 100, 50]);
      db.medic.bulkDocs.args.forEach(args => chai.expect(args[1]).to.deep.equal({ new_edits: false }));
      chai.expect(result.accepted).to.equal(250);
      chai.expect(result.rejected).to.equal(0);
    });

    it('does not write when authorization allows nothing', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'b' }]));
      bulkDocsService.filterOfflineRequest.resolves([]);
      const result = await service.process(envelopeFor(), 'sig', bodyStream());

      chai.expect(db.medic.bulkDocs.called).to.be.false;
      chai.expect(result).to.include({ accepted: 0, rejected: 2 });
    });

    it('counts docs the peer may not write as rejected', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'forbidden' }]));
      bulkDocsService.filterOfflineRequest.resolves([{ _id: 'a' }]);
      const result = await service.process(envelopeFor(), 'sig', bodyStream());
      chai.expect(result).to.include({ accepted: 1, rejected: 1 });
    });

    it('counts docs CouchDB refused as rejected', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'b' }]));
      db.medic.bulkDocs.resolves([{ id: 'b', error: 'conflict' }]);
      const result = await service.process(envelopeFor(), 'sig', bodyStream());
      chai.expect(result).to.include({ accepted: 1, rejected: 1 });
    });
  });

  describe('checkpoint', () => {
    it('advances to end_seq when the bundle continues from the stored checkpoint', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      db.medic.get.withArgs(CHECKPOINT_ID).resolves({ _id: CHECKPOINT_ID, _rev: '1-a', seq: 5 });

      await service.process(envelopeFor({ start_seq: 5, end_seq: 9 }), 'sig', bodyStream());
      chai.expect(db.medic.put.args[0][0]).to.deep.equal({ _id: CHECKPOINT_ID, _rev: '1-a', seq: 9 });
    });

    it('starts from zero when no checkpoint is stored yet', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(envelopeFor({ start_seq: 0, end_seq: 5 }), 'sig', bodyStream());
      chai.expect(db.medic.put.args[0][0]).to.deep.equal({ _id: CHECKPOINT_ID, seq: 5 });
    });

    it('parks below a gap, but still ingests the docs', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      db.medic.get.withArgs(CHECKPOINT_ID).resolves({ _id: CHECKPOINT_ID, _rev: '1-a', seq: 5 });

      await service.process(envelopeFor({ start_seq: 9, end_seq: 12 }), 'sig', bodyStream());
      chai.expect(db.medic.put.called).to.be.false;
      chai.expect(db.medic.bulkDocs.called).to.be.true;
      // the seal still carries the OLD position, so the peer knows it must resend the gap
      chai.expect(JSON.parse(signing.sign.args[0][1].toString('utf8')).seq).to.equal(5);
    });

    it('seals with the server signing key and encrypts to the device', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const result = await service.process(envelopeFor(), 'sig', bodyStream());

      chai.expect(signing.sign.args[0][0]).to.deep.equal(SERVER_SIGNING_JWK);
      chai.expect(JSON.parse(signing.sign.args[0][1].toString('utf8')))
        .to.deep.equal({ seq: 5, user: USER, device_id: DEVICE });
      chai.expect(age.encrypt.args[0][0]).to.equal(DEVICE_RECIPIENT);
      chai.expect(JSON.parse(age.encrypt.args[0][1].toString('utf8'))).to.deep.equal({
        checkpoint: { seq: 5, user: USER, device_id: DEVICE },
        signature: 'c2ln',
      });
      chai.expect(result.checkpoint).to.equal(SEALED_TOKEN);
    });
  });

  it('returns the envelope position alongside the counts and the sealed checkpoint', async () => {
    stubDecryptStream(ndjson([{ _id: 'a' }]));
    const result = await service.process(envelopeFor(), 'sig', bodyStream());

    chai.expect(result).to.deep.equal({
      user: USER,
      device_id: DEVICE,
      bundle_seq: 1,
      start_seq: 0,
      end_seq: 5,
      accepted: 1,
      rejected: 0,
      checkpoint: SEALED_TOKEN,
    });
  });
});
