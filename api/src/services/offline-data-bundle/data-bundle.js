const crypto = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const logger = require('@medic/logger');
const db = require('../../db');
const config = require('../../config');
const dataContext = require('../data-context');
const auth = require('../../auth');
const { users } = require('@medic/user-management')(config, db, dataContext);
const { BadRequestError, PayloadTooLargeError } = require('../../errors');
const age = require('./age');
const signing = require('./signing');
const serverKey = require('./server-key');
const bulkDocsService = require('../replication/bulk-docs');

// Docs are authorized and written a batch at a time as they come off the stream, so a bundle is
// never held whole in memory. 100 matches the batch size the webapp replicates with
// (`webapp/src/ts/services/db-sync.service.ts`).
const DOC_BATCH_SIZE = 100;
// Matches nginx's `client_max_body_size` and api's own MAX_REQUEST_SIZE, so an oversized bundle is
// refused from its declared size rather than after we have read it.
const MAX_BODY_SIZE = 32 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Wire contract (the client MUST match this byte-for-byte).
//
// A request carries exactly ONE bundle:
//   POST /api/v1/replication/data-bundle
//   Content-Type: application/octet-stream
//   X-Medic-Bundle-Envelope:  base64( utf8( JSON envelope ) )
//   X-Medic-Bundle-Signature: base64( Ed25519 signature )
//   <body> = the raw age ciphertext (NDJSON of the docs, encrypted to the server)
//
// The signed message is the DECODED envelope header bytes exactly as they arrived, so the server
// verifies what it received instead of reproducing a canonical form of it. The envelope binds
// itself to the body through `payload_sha256`, so the signature still covers the payload
// transitively while staying verifiable before a single body byte is read.
//
// DOC ORDER IS THE CLIENT'S JOB. Docs are authorized in batches, and a batch can only grant access
// from the docs it contains plus what is already in the database. A report whose contact arrives in
// a LATER batch is therefore dropped and never retried. Packing the docs in the order they changed
// (oldest first) is what avoids this, because the webapp always writes a contact before any report
// that depends on it.
// ---------------------------------------------------------------------------

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

// The declared size is checked before the body is read, the same way archive.js guards its upload.
const checkDeclaredSize = (req, envelope) => {
  const contentLength = Number(req.headers['content-length']);
  if (contentLength > MAX_BODY_SIZE) {
    throw new PayloadTooLargeError(`Request body is larger than ${MAX_BODY_SIZE} bytes`);
  }
  if (Number.isFinite(contentLength) && contentLength !== envelope.payload_bytes) {
    throw new BadRequestError('Content-Length does not match the envelope.');
  }
};

// `bundle_seq` is the only sequence the server needs: it lets a relay order bundles and spot a gap
// without opening them. Where those docs sat in the peer's own change feed is the peer's business.
const isValidEnvelope = (envelope) => {
  return !!envelope &&
    typeof envelope === 'object' &&
    isNonEmptyString(envelope.user) &&
    isNonEmptyString(envelope.device_id) &&
    isNonEmptyString(envelope.payload_sha256) &&
    Number.isFinite(envelope.bundle_seq) &&
    Number.isFinite(envelope.payload_bytes) &&
    envelope.payload_bytes >= 0 &&
    envelope.payload_bytes <= MAX_BODY_SIZE;
};

// Unpacks the two request headers. The decoded envelope bytes are kept as they arrived because
// they ARE the signed message; re-encoding them would risk verifying something else.
const unpackHeaders = (encodedEnvelope, signature) => {
  if (!isNonEmptyString(encodedEnvelope) || !isNonEmptyString(signature)) {
    throw new BadRequestError('Missing bundle envelope or signature header.');
  }

  const envelopeBytes = Buffer.from(encodedEnvelope, 'base64');
  let envelope;
  try {
    envelope = JSON.parse(envelopeBytes.toString('utf8'));
  } catch {
    throw new BadRequestError('Bundle envelope is not valid base64 json.');
  }

  if (!isValidEnvelope(envelope)) {
    throw new BadRequestError('Invalid envelope.');
  }
  return { envelope, envelopeBytes };
};

// Builds the CHW's userCtx the same way the session middleware does: `auth.getUserSettings` reads
// the _users doc (for roles) and the medic user-settings doc, then hydrates
// facility_id/contact_id onto it. Resolved BEFORE the payload is touched: an online-only user must
// never be pushed through the offline write-authorization pipeline, and finding that out is cheap.
const getOfflineUserCtx = async (username) => {
  const userCtx = await auth.getUserSettings({ name: username });
  if (auth.isOnlineOnly(userCtx)) {
    throw new BadRequestError('Bundles can only be ingested for offline users.');
  }
  return userCtx;
};

// ---------------------------------------------------------------------------
// Streaming ingest.
//
// The request body is piped straight into age, so the ciphertext is never held whole, and the docs
// it decrypts to are written as they arrive. Every byte on the way past feeds a sha256 and a length
// counter, checked against the envelope once the stream ends.
// ---------------------------------------------------------------------------
const digestingStream = (body, digest, maxBytes) => {
  const counting = new Transform({
    transform(chunk, _encoding, callback) {
      digest.hash.update(chunk);
      digest.bytes += chunk.length;
      // Stop as soon as the body outgrows what the envelope declared, rather than reading on
      // through a body that is already known to be wrong.
      if (digest.bytes > maxBytes) {
        return callback(new PayloadTooLargeError('Payload is larger than the envelope declared.'));
      }
      callback(null, chunk);
    },
  });
  // `pipe` does not forward a source failure, so an aborted request would leave the decrypter
  // waiting on a stream nobody is going to end.
  body.on('error', err => counting.destroy(err));
  return Readable.toWeb(body.pipe(counting));
};

const corruptPayload = (err, envelope) => {
  if (err instanceof BadRequestError || err instanceof PayloadTooLargeError) {
    return err;
  }
  logger.warn(
    'offline-data-bundle: failed to decrypt/parse payload for %s/%s: %o',
    envelope.user,
    envelope.device_id,
    err
  );
  return new BadRequestError('Corrupt payload.');
};

const parseLine = (line) => {
  if (!line.trim().length) {
    return null;
  }
  const doc = JSON.parse(line);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Bundle line is not a document.');
  }
  return doc;
};

const parseLines = (lines) => lines.map(parseLine).filter(Boolean);

// Yields docs as the decrypted stream produces them. Lines straddle chunk boundaries, so a carry
// buffer holds the partial trailing line until the next chunk completes it.
const streamDocs = async function* (plaintext) {
  const decoder = new TextDecoder();
  let carry = '';
  for await (const chunk of plaintext) {
    carry += decoder.decode(chunk, { stream: true });
    const lines = carry.split('\n');
    carry = lines.pop();
    yield* parseLines(lines);
  }
  yield* parseLines([carry + decoder.decode()]);
};

// Only decryption and parsing failures are raised here: a failure in the consumer (a CouchDB
// write) ends the delegated generator without passing through this catch, so it keeps its own
// status instead of becoming a 400.
const readDocs = async function* (plaintext, envelope) {
  try {
    yield* streamDocs(plaintext);
  } catch (err) {
    throw corruptPayload(err, envelope);
  }
};

// Writes one batch with new_edits:false to preserve the CHW's original revisions. The design relies
// on CouchDB's revision-based dedup so a doc arriving via both P2P and direct sync does not
// duplicate or conflict. Under new_edits:false CouchDB only returns entries for docs that FAILED.
// Returns how many of the batch did not make it, for the server-side log.
const writeBatch = async (userCtx, batch) => {
  const allowedDocs = await bulkDocsService.filterOfflineRequest(userCtx, batch);
  if (!allowedDocs.length) {
    return batch.length;
  }
  const results = await db.medic.bulkDocs(allowedDocs, { new_edits: false });
  const failed = (results || []).filter(result => result?.error).length;
  return batch.length - allowedDocs.length + failed;
};

const ingest = async (userCtx, plaintext, envelope) => {
  let batch = [];
  let total = 0;
  let dropped = 0;

  const flush = async () => {
    if (batch.length) {
      dropped += await writeBatch(userCtx, batch);
      batch = [];
    }
  };

  for await (const doc of readDocs(plaintext, envelope)) {
    batch.push(doc);
    total += 1;
    if (batch.length === DOC_BATCH_SIZE) {
      await flush();
    }
  }
  await flush();
  return { total, dropped };
};

// Reads the per-user _users doc. Device PUBLIC keys are stored on THIS doc (not the medic
// user-settings doc) under `keys_by_device`, keyed by device_id, by the device-key endpoint (#11278).
const getUserDoc = (username) => users
  .getUserDoc(username)
  .catch(err => {
    if (err.status === 404) {
      return null;
    }
    throw err;
  });

// Resolves both halves of the per-(user, device) key material: the device's registered signing
// public key from the _users doc, and the server's encryption private key for that device from the
// secureSettings vault. Either being absent means the server never registered this device.
const getKeys = async (envelope) => {
  const { user, device_id: deviceId } = envelope;
  const userDoc = await getUserDoc(user);
  const deviceSigningKey = userDoc?.keys_by_device?.[deviceId]?.signing_public_key;
  const serverEncryptionKey = await serverKey.getServerPrivateKey(user, deviceId);

  // The caller gets one error either way, but log which half is missing so this is debuggable.
  if (!deviceSigningKey) {
    logger.error(`offline-data-bundle: no registered device key for ${user}/${deviceId}.`);
  }
  if (!serverEncryptionKey) {
    logger.error(`offline-data-bundle: no server key material for ${user}/${deviceId}.`);
  }
  if (!deviceSigningKey || !serverEncryptionKey) {
    throw new BadRequestError('Unknown device.');
  }

  return { deviceSigningKey, serverEncryptionKey };
};

// The envelope carries the payload's digest, so verifying the signature also pins the body. This
// runs BEFORE the body is touched: an unsigned or misattributed bundle costs us nothing.
const verifyEnvelope = async (keys, envelopeBytes, signature) => {
  if (!(await signing.verify(keys.deviceSigningKey, signature, envelopeBytes))) {
    throw new BadRequestError('Bad signature.');
  }
};

// Docs are already written by the time this runs, so it no longer gates them. It still rejects the
// request, which is what tells the peer to send the bundle again; the rewrite is harmless because
// new_edits:false replays the same revisions.
const assertPayloadMatchesEnvelope = (envelope, digest) => {
  const actual = digest.hash.digest('base64');
  if (actual !== envelope.payload_sha256 || digest.bytes !== envelope.payload_bytes) {
    throw new BadRequestError('Payload does not match the envelope.');
  }
};

const decrypt = async (identity, ciphertext, envelope) => {
  try {
    return await age.decryptStream(identity, ciphertext);
  } catch (err) {
    throw corruptPayload(err, envelope);
  }
};

module.exports = {
  // Processes ONE bundle. `encodedEnvelope` and `signature` are the raw request header values and
  // `req` is the request stream carrying the age ciphertext. Throws with an HTTP `code` when the
  // bundle cannot be trusted; otherwise ingests the docs.
  process: async (encodedEnvelope, signature, req) => {
    const { envelope, envelopeBytes } = unpackHeaders(encodedEnvelope, signature);
    checkDeclaredSize(req, envelope);

    const keys = await getKeys(envelope);
    await verifyEnvelope(keys, envelopeBytes, signature);
    const userCtx = await getOfflineUserCtx(envelope.user);

    const digest = { hash: crypto.createHash('sha256'), bytes: 0 };
    const ciphertext = digestingStream(req, digest, envelope.payload_bytes);
    const plaintext = await decrypt(keys.serverEncryptionKey, ciphertext, envelope);
    const { total, dropped } = await ingest(userCtx, plaintext, envelope);
    assertPayloadMatchesEnvelope(envelope, digest);

    // The peer is not told which docs were dropped: the relay carrying this response cannot read
    // the bundle, and has no business learning what was in it.
    if (dropped) {
      logger.warn(
        `offline-data-bundle: dropped ${dropped} of ${total} docs for ${envelope.user}/${envelope.device_id}.`
      );
    }
  },
};
