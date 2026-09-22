const { expect } = require('chai').use(require('chai-as-promised'));
const sinon = require('sinon');
const { Readable } = require('stream');
const { ReadableStream } = require('stream/web');

const db = require('../../../../src/db');
const auth = require('../../../../src/auth');
const logger = require('@medic/logger');
const { BadRequestError, PayloadTooLargeError } = require('../../../../src/errors');
const age = require('../../../../src/services/offline-data-bundle/age');
const signing = require('../../../../src/services/offline-data-bundle/signing');
const serverKey = require('../../../../src/services/offline-data-bundle/server-key');
const bulkDocsService = require('../../../../src/services/replication/bulk-docs');
const config = require('../../../../src/config');
const dataContext = require('../../../../src/services/data-context');
const db2 = require('../../../../src/db');
const userManagement = require('@medic/user-management')(config, db2, dataContext);

const service = require('../../../../src/services/offline-data-bundle/data-bundle');

const USER = 'chw1';
const DEVICE = 'device-a';
const USER_DOC_ID = `org.couchdb.user:${USER}`;
// A stand-in for the device's Ed25519 signing public key JWK (verify is stubbed, so the exact
// contents do not matter - only that this object is the one handed to signing.verify).
const SIGNING_JWK = { kty: 'OKP', crv: 'Ed25519', x: 'device-a-pub' };
const SERVER_IDENTITY = 'AGE-SECRET-KEY-1SERVER';
const MAX_BODY_SIZE = 32 * 1024 * 1024;

const CIPHERTEXT = Buffer.from('an-age-ciphertext-payload');

const ndjson = (docs) => Buffer.from(docs.map(doc => JSON.stringify(doc)).join('\n'), 'utf8');

const encode = (envelope) => Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');

const envelopeFor = (overrides = {}) => ({
  user: USER,
  device_id: DEVICE,
  bundle_seq: 1,
  ...overrides,
});

// The body arrives as a Node stream, exactly like `req` does.
// Stands in for the express request: a readable body plus the headers the service reads.
const bodyStream = (buffer = CIPHERTEXT, headers = {}) => {
  const stream = Readable.from([buffer]);
  stream.headers = headers;
  return stream;
};

const webStream = (chunks) => new ReadableStream({
  start: (controller) => {
    chunks.forEach(chunk => controller.enqueue(new Uint8Array(chunk)));
    controller.close();
  },
});

// Drains the ciphertext stream (so the byte counter actually sees the bytes, like age would) and
// then hands back the decrypted NDJSON as a web stream.
const drain = async (stream) => {
  const reader = stream.getReader();
  let done = false;
  while (!done) {
    ({ done } = await reader.read());
  }
};

const stubDecryptStream = (plaintext) => {
  return sinon.stub(age, 'decryptStream').callsFake(async (identity, cipherStream) => {
    await drain(cipherStream);
    return webStream([plaintext]);
  });
};

const docsWritten = () => db.medic.bulkDocs.args.flatMap(args => args[0]);

describe('offline-data-bundle data-bundle service', () => {
  let userDoc;

  beforeEach(() => {
    userDoc = {
      _id: USER_DOC_ID,
      keys_by_device: { [DEVICE]: { signing_public_key: SIGNING_JWK } },
    };
    sinon.stub(userManagement.users, 'getUserDoc').resolves(userDoc);
    sinon.stub(serverKey, 'getServerPrivateKey').resolves(SERVER_IDENTITY);
    sinon.stub(signing, 'verify').resolves(true);
    sinon.stub(db.medic, 'bulkDocs').resolves([]);
    sinon.stub(auth, 'getUserSettings').resolves({ name: USER, roles: ['chw'] });
    sinon.stub(auth, 'isOnlineOnly').returns(false);
    sinon.stub(auth, 'hasAllPermissions').returns(true);
    sinon.stub(bulkDocsService, 'filterOfflineRequest').callsFake((userCtx, docs) => Promise.resolve(docs));
    sinon.stub(logger, 'warn');
  });

  afterEach(() => sinon.restore());

  describe('envelope validation', () => {
    ['user', 'device_id'].forEach(field => {
      it(`rejects an envelope missing ${field}`, async () => {
        const envelope = envelopeFor();
        delete envelope[field];
        await expect(service.process(encode(envelope), 'sig', bodyStream()))
          .to.be.rejectedWith(BadRequestError, 'Invalid envelope.');
      });
    });

    it('accepts an envelope carrying only what the server acts on', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode({ user: USER, device_id: DEVICE }), 'sig', bodyStream());
      expect(docsWritten()).to.deep.equal([{ _id: 'a' }]);
    });

    it('rejects a missing envelope header', async () => {
      await expect(service.process(null, 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Missing bundle envelope or signature header.');
    });

    it('rejects a missing signature header', async () => {
      await expect(service.process(encode(envelopeFor()), null, bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Missing bundle envelope or signature header.');
    });

    it('rejects an envelope header that is not base64 json', async () => {
      await expect(service.process('bm90LWpzb24=', 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Bundle envelope is not valid base64 json.');
    });

    it('does not touch the body when the envelope is invalid', async () => {
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expect(service.process(encode({}), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Invalid envelope.');
      expect(decryptStream.called).to.be.false;
    });
  });

  describe('device resolution', () => {
    it('rejects when the user doc does not exist', async () => {
      const err = new Error('missing');
      err.status = 404;
      userManagement.users.getUserDoc.rejects(err);
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Unknown device.');
    });

    it('rejects when the device has no registered key', async () => {
      userDoc.keys_by_device = {};
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Unknown device.');
    });

    it('rejects when the server holds no private key for the device', async () => {
      serverKey.getServerPrivateKey.resolves(null);
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Unknown device.');
    });

    it('propagates an unexpected error reading the user doc', async () => {
      userManagement.users.getUserDoc.rejects(new Error('couch is down'));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith('couch is down');
    });
  });

  describe('signature', () => {
    it('verifies over the decoded envelope bytes exactly as they arrived', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const envelope = envelopeFor();
      await service.process(encode(envelope), 'the-signature', bodyStream());

      expect(signing.verify.callCount).to.equal(1);
      const [key, signature, message] = signing.verify.args[0];
      expect(key).to.deep.equal(SIGNING_JWK);
      expect(signature).to.equal('the-signature');
      // the signed message is the transmitted bytes, so no canonical form is reproduced here
      expect(message.toString('utf8')).to.equal(JSON.stringify(envelope));
    });

    it('rejects a bad signature without reading the body', async () => {
      signing.verify.resolves(false);
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Bad signature.');
      expect(decryptStream.called).to.be.false;
      expect(db.medic.bulkDocs.called).to.be.false;
    });
  });

  describe('payload', () => {
    it('rejects when decryption fails', async () => {
      sinon.stub(age, 'decryptStream').rejects(new Error('no identity matched'));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Corrupt payload.');
      expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('rejects when the payload is not valid NDJSON', async () => {
      stubDecryptStream(Buffer.from('{not json}', 'utf8'));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Corrupt payload.');
    });

    it('lets a write failure keep its own status instead of becoming a bad request', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      db.medic.bulkDocs.rejects(new Error('couch is down'));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith('couch is down');
    });

    it('fails rather than hanging when the request aborts mid-body', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const body = new Readable({ read() {
        this.destroy(new Error('aborted'));
      } });
      body.headers = {};

      await expect(service.process(encode(envelopeFor()), 'sig', body))
        .to.be.rejectedWith(BadRequestError, 'Corrupt payload.');
    });

    it('aborts mid-stream when the body outgrows the max body size', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const body = bodyStream(Buffer.alloc(MAX_BODY_SIZE + 1));
      await expect(service.process(encode(envelopeFor()), 'sig', body))
        .to.be.rejectedWith(PayloadTooLargeError, `Request body is larger than ${MAX_BODY_SIZE} bytes`);
      expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('decrypts with the server private key for this device', async () => {
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      expect(serverKey.getServerPrivateKey.args[0]).to.deep.equal([USER, DEVICE]);
      expect(decryptStream.args[0][0]).to.equal(SERVER_IDENTITY);
    });

    it('parses NDJSON lines that straddle stream chunks', async () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
      const bytes = ndjson(docs);
      // split mid-line so the carry buffer has to stitch the pieces back together
      sinon.stub(age, 'decryptStream').callsFake(async (identity, cipherStream) => {
        await drain(cipherStream);
        return webStream([bytes.subarray(0, 7), bytes.subarray(7, 20), bytes.subarray(20)]);
      });

      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      expect(docsWritten()).to.deep.equal(docs);
    });

    it('rejects a line that is not a document', async () => {
      stubDecryptStream(Buffer.from('{"_id":"a"}\n"just a string"\n', 'utf8'));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Corrupt payload.');
    });

    it('rejects a line that is an array', async () => {
      stubDecryptStream(Buffer.from('[{"_id":"a"}]\n', 'utf8'));
      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Corrupt payload.');
    });

    it('ignores blank lines', async () => {
      stubDecryptStream(Buffer.from('{"_id":"a"}\n\n{"_id":"b"}\n', 'utf8'));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      expect(docsWritten()).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);
    });
  });

  describe('declared size', () => {
    it('rejects a content-length over the max body size', async () => {
      const body = bodyStream(CIPHERTEXT, { 'content-length': String(MAX_BODY_SIZE + 1) });
      await expect(service.process(encode(envelopeFor()), 'sig', body))
        .to.be.rejectedWith(PayloadTooLargeError, `Request body is larger than ${MAX_BODY_SIZE} bytes`);
    });

    it('accepts a content-length under the max body size', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const body = bodyStream(CIPHERTEXT, { 'content-length': String(CIPHERTEXT.length) });
      await service.process(encode(envelopeFor()), 'sig', body);
      expect(docsWritten()).to.deep.equal([{ _id: 'a' }]);
    });

    it('proceeds when no content-length is set', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      expect(docsWritten()).to.deep.equal([{ _id: 'a' }]);
    });
  });

  describe('user', () => {
    it('rejects an online-only user before any payload is read', async () => {
      auth.isOnlineOnly.returns(true);
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));

      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'Bundles can only be ingested for offline users.');
      expect(decryptStream.called).to.be.false;
      expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('rejects a user who may not send bundles before any payload is read', async () => {
      auth.hasAllPermissions.returns(false);
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));

      await expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith(BadRequestError, 'This user cannot send offline data bundles.');
      expect(auth.hasAllPermissions.args[0]).to.deep.equal([
        { name: USER, roles: ['chw'] },
        ['can_send_offline_data_bundle'],
      ]);
      expect(decryptStream.called).to.be.false;
      expect(db.medic.bulkDocs.called).to.be.false;
    });
  });

  describe('ingest', () => {
    it('authorizes as the peer, not the relaying user', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      expect(auth.getUserSettings.args[0]).to.deep.equal([{ name: USER }]);
      expect(bulkDocsService.filterOfflineRequest.args[0][0]).to.deep.equal({ name: USER, roles: ['chw'] });
    });

    it('authorizes and writes a batch at a time as the stream produces docs', async () => {
      const docs = Array.from({ length: 250 }, (unused, i) => ({ _id: `doc-${i}` }));
      stubDecryptStream(ndjson(docs));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());

      expect(bulkDocsService.filterOfflineRequest.args.map(args => args[1].length))
        .to.deep.equal([100, 100, 50]);
      expect(db.medic.bulkDocs.args.map(args => args[0].length)).to.deep.equal([100, 100, 50]);
      db.medic.bulkDocs.args.forEach(args => expect(args[1]).to.deep.equal({ new_edits: false }));
      expect(docsWritten()).to.deep.equal(docs);
    });

    it('does not write when authorization allows nothing', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'b' }]));
      bulkDocsService.filterOfflineRequest.resolves([]);
      await service.process(encode(envelopeFor()), 'sig', bodyStream());

      expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('logs the docs the peer may not write rather than reporting them back', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'forbidden' }]));
      bulkDocsService.filterOfflineRequest.resolves([{ _id: 'a' }]);
      const result = await service.process(encode(envelopeFor()), 'sig', bodyStream());

      expect(result).to.be.undefined;
      expect(logger.warn.args[0][0]).to.equal(`offline-data-bundle: dropped 1 of 2 docs for ${USER}/${DEVICE}.`);
    });

    it('logs the docs CouchDB refused', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'b' }]));
      db.medic.bulkDocs.resolves([{ id: 'b', error: 'conflict' }]);
      await service.process(encode(envelopeFor()), 'sig', bodyStream());

      expect(logger.warn.args[0][0]).to.equal(`offline-data-bundle: dropped 1 of 2 docs for ${USER}/${DEVICE}.`);
    });

    it('says nothing when every doc landed', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      expect(logger.warn.called).to.be.false;
    });
  });
});
