const chai = require('chai');
const sinon = require('sinon');
const crypto = require('crypto');
const { Readable } = require('stream');
const { ReadableStream } = require('stream/web');

const db = require('../../../../src/db');
const auth = require('../../../../src/auth');
const logger = require('@medic/logger');
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

const CIPHERTEXT = Buffer.from('an-age-ciphertext-payload');
const PAYLOAD_SHA256 = crypto.createHash('sha256').update(CIPHERTEXT).digest('base64');

const notFound = () => {
  const err = new Error('missing');
  err.status = 404;
  return err;
};

const ndjson = (docs) => Buffer.from(docs.map(doc => JSON.stringify(doc)).join('\n'), 'utf8');

const encode = (envelope) => Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');

const envelopeFor = (overrides = {}) => ({
  user: USER,
  device_id: DEVICE,
  bundle_seq: 1,
  payload_sha256: PAYLOAD_SHA256,
  payload_bytes: CIPHERTEXT.length,
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

// Drains the ciphertext stream (so the sha256 tap actually sees the bytes, like age would) and
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
    sinon.stub(bulkDocsService, 'filterOfflineRequest').callsFake((userCtx, docs) => Promise.resolve(docs));
    sinon.stub(logger, 'warn');
  });

  afterEach(() => sinon.restore());

  describe('envelope validation', () => {
    const required = ['user', 'device_id', 'bundle_seq', 'payload_sha256', 'payload_bytes'];

    required.forEach(field => {
      it(`rejects an envelope missing ${field}`, async () => {
        const envelope = envelopeFor();
        delete envelope[field];
        await expectRejection(service.process(encode(envelope), 'sig', bodyStream()), 400, 'Invalid envelope.');
      });
    });

    it('accepts an envelope without the peer sequence bounds it used to carry', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(docsWritten()).to.deep.equal([{ _id: 'a' }]);
    });

    it('rejects a missing envelope header', async () => {
      await expectRejection(
        service.process(null, 'sig', bodyStream()), 400, 'Missing bundle envelope or signature header.'
      );
    });

    it('rejects a missing signature header', async () => {
      await expectRejection(
        service.process(encode(envelopeFor()), null, bodyStream()),
        400,
        'Missing bundle envelope or signature header.'
      );
    });

    it('rejects an envelope header that is not base64 json', async () => {
      await expectRejection(
        service.process('bm90LWpzb24=', 'sig', bodyStream()), 400, 'Bundle envelope is not valid base64 json.'
      );
    });

    it('rejects a payload_bytes over the max body size', async () => {
      await expectRejection(
        service.process(encode(envelopeFor({ payload_bytes: 33 * 1024 * 1024 })), 'sig', bodyStream()),
        400,
        'Invalid envelope.'
      );
    });

    it('does not touch the body when the envelope is invalid', async () => {
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(service.process(encode({}), 'sig', bodyStream()), 400, 'Invalid envelope.');
      chai.expect(decryptStream.called).to.be.false;
    });
  });

  describe('device resolution', () => {
    it('rejects when the user doc does not exist', async () => {
      userManagement.users.getUserDoc.rejects(notFound());
      await expectRejection(service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Unknown device.');
    });

    it('rejects when the device has no registered key', async () => {
      userDoc.keys_by_device = {};
      await expectRejection(service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Unknown device.');
    });

    it('rejects when the server holds no private key for the device', async () => {
      serverKey.getServerPrivateKey.resolves(null);
      await expectRejection(service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Unknown device.');
    });

    it('propagates an unexpected error reading the user doc', async () => {
      userManagement.users.getUserDoc.rejects(new Error('couch is down'));
      await chai
        .expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith('couch is down');
    });
  });

  describe('signature', () => {
    it('verifies over the decoded envelope bytes exactly as they arrived', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const envelope = envelopeFor();
      await service.process(encode(envelope), 'the-signature', bodyStream());

      chai.expect(signing.verify.callCount).to.equal(1);
      const [key, signature, message] = signing.verify.args[0];
      chai.expect(key).to.deep.equal(SIGNING_JWK);
      chai.expect(signature).to.equal('the-signature');
      // the signed message is the transmitted bytes, so no canonical form is reproduced here
      chai.expect(message.toString('utf8')).to.equal(JSON.stringify(envelope));
    });

    it('rejects a bad signature without reading the body', async () => {
      signing.verify.resolves(false);
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Bad signature.');
      chai.expect(decryptStream.called).to.be.false;
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });
  });

  describe('payload', () => {
    it('rejects when decryption fails', async () => {
      sinon.stub(age, 'decryptStream').rejects(new Error('no identity matched'));
      await expectRejection(
        service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Corrupt payload.'
      );
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('rejects when the payload is not valid NDJSON', async () => {
      stubDecryptStream(Buffer.from('{not json}', 'utf8'));
      await expectRejection(service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Corrupt payload.');
    });

    it('lets a write failure keep its own status instead of becoming a bad request', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      db.medic.bulkDocs.rejects(new Error('couch is down'));
      await chai
        .expect(service.process(encode(envelopeFor()), 'sig', bodyStream()))
        .to.be.rejectedWith('couch is down');
    });

    it('fails rather than hanging when the request aborts mid-body', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const body = new Readable({ read() {
        this.destroy(new Error('aborted'));
      } });
      body.headers = {};

      await expectRejection(service.process(encode(envelopeFor()), 'sig', body), 400, 'Corrupt payload.');
    });

    it('rejects when the body digest does not match the envelope', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const envelope = envelopeFor({ payload_sha256: crypto.createHash('sha256').update('other').digest('base64') });
      await expectRejection(
        service.process(encode(envelope), 'sig', bodyStream()),
        400,
        'Payload does not match the envelope.'
      );
    });

    it('aborts mid-stream when the body outgrows the declared length', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(
        service.process(encode(envelopeFor({ payload_bytes: 3 })), 'sig', bodyStream()),
        413,
        'Payload is larger than the envelope declared.'
      );
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('rejects when the body is shorter than the declared length', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await expectRejection(
        service.process(encode(envelopeFor({ payload_bytes: CIPHERTEXT.length + 10 })), 'sig', bodyStream()),
        400,
        'Payload does not match the envelope.'
      );
    });

    it('decrypts with the server private key for this device', async () => {
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(serverKey.getServerPrivateKey.args[0]).to.deep.equal([USER, DEVICE]);
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

      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(docsWritten()).to.deep.equal(docs);
    });

    it('rejects a line that is not a document', async () => {
      stubDecryptStream(Buffer.from('{"_id":"a"}\n"just a string"\n', 'utf8'));
      await expectRejection(service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Corrupt payload.');
    });

    it('rejects a line that is an array', async () => {
      stubDecryptStream(Buffer.from('[{"_id":"a"}]\n', 'utf8'));
      await expectRejection(
        service.process(encode(envelopeFor()), 'sig', bodyStream()), 400, 'Corrupt payload.'
      );
    });

    it('ignores blank lines', async () => {
      stubDecryptStream(Buffer.from('{"_id":"a"}\n\n{"_id":"b"}\n', 'utf8'));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(docsWritten()).to.deep.equal([{ _id: 'a' }, { _id: 'b' }]);
    });
  });

  describe('declared size', () => {
    it('rejects a content-length over the max body size', async () => {
      const body = bodyStream(CIPHERTEXT, { 'content-length': String(33 * 1024 * 1024) });
      await expectRejection(
        service.process(encode(envelopeFor()), 'sig', body),
        413,
        `Request body is larger than ${32 * 1024 * 1024} bytes`
      );
    });

    it('rejects a content-length that disagrees with the envelope', async () => {
      const body = bodyStream(CIPHERTEXT, { 'content-length': '999' });
      await expectRejection(
        service.process(encode(envelopeFor()), 'sig', body),
        400,
        'Content-Length does not match the envelope.'
      );
    });

    it('accepts a content-length that matches the envelope', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      const body = bodyStream(CIPHERTEXT, { 'content-length': String(CIPHERTEXT.length) });
      await service.process(encode(envelopeFor()), 'sig', body);
      chai.expect(docsWritten()).to.deep.equal([{ _id: 'a' }]);
    });

    it('proceeds when no content-length is set', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(docsWritten()).to.deep.equal([{ _id: 'a' }]);
    });
  });

  describe('user', () => {
    it('rejects an online-only user before any payload is read', async () => {
      auth.isOnlineOnly.returns(true);
      const decryptStream = stubDecryptStream(ndjson([{ _id: 'a' }]));

      await expectRejection(
        service.process(encode(envelopeFor()), 'sig', bodyStream()),
        400,
        'Bundles can only be ingested for offline users.'
      );
      chai.expect(decryptStream.called).to.be.false;
      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });
  });

  describe('ingest', () => {
    it('authorizes as the peer, not the relaying user', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(auth.getUserSettings.args[0]).to.deep.equal([{ name: USER }]);
      chai.expect(bulkDocsService.filterOfflineRequest.args[0][0]).to.deep.equal({ name: USER, roles: ['chw'] });
    });

    it('authorizes and writes a batch at a time as the stream produces docs', async () => {
      const docs = Array.from({ length: 250 }, (unused, i) => ({ _id: `doc-${i}` }));
      stubDecryptStream(ndjson(docs));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());

      chai.expect(bulkDocsService.filterOfflineRequest.args.map(args => args[1].length))
        .to.deep.equal([100, 100, 50]);
      chai.expect(db.medic.bulkDocs.args.map(args => args[0].length)).to.deep.equal([100, 100, 50]);
      db.medic.bulkDocs.args.forEach(args => chai.expect(args[1]).to.deep.equal({ new_edits: false }));
      chai.expect(docsWritten()).to.deep.equal(docs);
    });

    it('does not write when authorization allows nothing', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'b' }]));
      bulkDocsService.filterOfflineRequest.resolves([]);
      await service.process(encode(envelopeFor()), 'sig', bodyStream());

      chai.expect(db.medic.bulkDocs.called).to.be.false;
    });

    it('logs the docs the peer may not write rather than reporting them back', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'forbidden' }]));
      bulkDocsService.filterOfflineRequest.resolves([{ _id: 'a' }]);
      const result = await service.process(encode(envelopeFor()), 'sig', bodyStream());

      chai.expect(result).to.be.undefined;
      chai.expect(logger.warn.args[0][0]).to.equal(`offline-data-bundle: dropped 1 of 2 docs for ${USER}/${DEVICE}.`);
    });

    it('logs the docs CouchDB refused', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }, { _id: 'b' }]));
      db.medic.bulkDocs.resolves([{ id: 'b', error: 'conflict' }]);
      await service.process(encode(envelopeFor()), 'sig', bodyStream());

      chai.expect(logger.warn.args[0][0]).to.equal(`offline-data-bundle: dropped 1 of 2 docs for ${USER}/${DEVICE}.`);
    });

    it('says nothing when every doc landed', async () => {
      stubDecryptStream(ndjson([{ _id: 'a' }]));
      await service.process(encode(envelopeFor()), 'sig', bodyStream());
      chai.expect(logger.warn.called).to.be.false;
    });
  });
});
