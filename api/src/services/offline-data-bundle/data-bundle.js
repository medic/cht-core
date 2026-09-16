const crypto = require('node:crypto');
const { ReadableStream } = require('node:stream/web');
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

const CHECKPOINT_PREFIX = '_local/offline-checkpoint:';
// Docs are written to CouchDB in chunks so a single bulkDocs call stays bounded. This splits only
// the WRITES: authorization runs once over the whole set (see ingest), because the offline filter
// is not safe to feed in pieces.
const WRITE_BATCH_SIZE = 100;
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

const isValidEnvelope = (envelope) => {
  return !!envelope &&
    typeof envelope === 'object' &&
    isNonEmptyString(envelope.user) &&
    isNonEmptyString(envelope.device_id) &&
    isNonEmptyString(envelope.payload_sha256) &&
    Number.isFinite(envelope.bundle_seq) &&
    Number.isFinite(envelope.start_seq) &&
    Number.isFinite(envelope.end_seq) &&
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
// The request body is piped straight into age, so the ciphertext is never held whole. On the way
// past, every byte feeds a sha256 and a length counter that are checked against the envelope once
// the stream ends. Nothing is written before that check passes.
// ---------------------------------------------------------------------------
const digestingStream = (body, digest, maxBytes) => {
  const chunks = body[Symbol.asyncIterator]();
  // `pull` is only called when age asks for more, so the request keeps its backpressure.
  return new ReadableStream({
    pull: async (controller) => {
      const { value, done } = await chunks.next();
      if (done) {
        return controller.close();
      }
      digest.hash.update(value);
      digest.bytes += value.length;
      // Stop as soon as the body outgrows what the envelope declared, rather than reading on
      // through a body that is already known to be wrong.
      if (digest.bytes > maxBytes) {
        throw new PayloadTooLargeError('Payload is larger than the envelope declared.');
      }
      controller.enqueue(new Uint8Array(value));
    },
    cancel: () => body.destroy(),
  });
};

// Reads the decrypted stream as NDJSON. Lines straddle chunk boundaries, so a carry buffer holds
// the partial trailing line until the next chunk completes it.
const readDocs = async (plaintext) => {
  const decoder = new TextDecoder();
  const docs = [];
  let carry = '';

  const pushLine = (line) => {
    if (!line.trim().length) {
      return;
    }
    const doc = JSON.parse(line);
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new Error('Bundle line is not a document.');
    }
    docs.push(doc);
  };

  for await (const chunk of plaintext) {
    carry += decoder.decode(chunk, { stream: true });
    const lines = carry.split('\n');
    carry = lines.pop();
    lines.forEach(pushLine);
  }
  pushLine(carry + decoder.decode());
  return docs;
};

// Ingest with new_edits:false to preserve the CHW's original revisions. The design relies on
// CouchDB's revision-based dedup so a doc arriving via both P2P and direct sync does not
// duplicate or conflict. Under new_edits:false CouchDB only returns entries for docs that
// FAILED, so accepted = total - errors.
const writeDocs = async (docs) => {
  let accepted = 0;
  const remaining = [...docs];
  while (remaining.length) {
    const batch = remaining.splice(0, WRITE_BATCH_SIZE);
    const results = await db.medic.bulkDocs(batch, { new_edits: false });
    accepted += batch.length - (results || []).filter(result => result?.error).length;
  }
  return accepted;
};

// Authorization runs ONCE over the whole doc set on purpose. `filterAllowedDocs` iterates until
// the authorization context stops growing, so a report can become allowed on a later pass because
// the contact granting access to it sits further down the array. Filtering chunk by chunk would
// silently drop those docs.
const ingest = async (userCtx, docs) => {
  const allowedDocs = await bulkDocsService.filterOfflineRequest(userCtx, docs);
  const accepted = allowedDocs.length ? await writeDocs(allowedDocs) : 0;
  return { accepted, rejected: docs.length - accepted };
};

const readCheckpointDoc = async (id) => {
  try {
    return await db.medic.get(id);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

const persistCheckpoint = async (id, existing, checkpoint) => {
  const doc = { _id: id, seq: checkpoint };
  if (existing?._rev) {
    doc._rev = existing._rev;
  }
  await db.medic.put(doc);
};

// ---------------------------------------------------------------------------
// Sealed-checkpoint token contract (the CHW client, #11282, MUST implement the
// inverse to open it). The checkpoint is relayed back through an UNTRUSTED taxi,
// so the server seals it: it is the only party holding both the per-device
// signing private key and the device's encryption public key. Sign-then-encrypt:
//
//   inner      = { seq, user, device_id }
//   innerBytes = utf8( JSON.stringify(inner) )
//   signature  = base64( Ed25519_sign(server signing private key, innerBytes) )
//   signed     = utf8( JSON.stringify({ checkpoint: inner, signature }) )
//   ciphertext = age.encrypt(device encryption public key, signed)
//   token      = base64(ciphertext)
//
// The device age-decrypts the token with its encryption identity, then verifies
// `signature` over utf8( JSON.stringify(checkpoint) ) using the server signing
// public key it received at device registration. A taxi cannot forge a higher
// seq (it has no signing key) nor read the checkpoint (it has no decryption
// identity), which is what prevents a taxi from tricking the CHW into skipping
// unsent data.
// ---------------------------------------------------------------------------
const sealCheckpoint = async (keys, user, deviceId, seq) => {
  const inner = { seq, user, device_id: deviceId };
  const innerBytes = Buffer.from(JSON.stringify(inner), 'utf8');
  const signature = await signing.sign(keys.serverSigningKey, innerBytes);
  const signed = Buffer.from(JSON.stringify({ checkpoint: inner, signature }), 'utf8');
  const ciphertext = await age.encrypt(keys.deviceEncryptionKey, signed);
  return Buffer.from(ciphertext).toString('base64');
};

// ---------------------------------------------------------------------------
// Contiguity contract (ratified: CHECKPOINT-CONTIGUOUS).
//
// The checkpoint only advances when this bundle starts exactly where the stored checkpoint left
// off. A bundle that arrives out of order still has its docs ingested, but parks the checkpoint
// below the gap until the bundle that fills it turns up in a later request.
// ---------------------------------------------------------------------------
const settleCheckpoint = async (keys, envelope) => {
  const id = `${CHECKPOINT_PREFIX}${envelope.user}:${envelope.device_id}`;
  const existing = await readCheckpointDoc(id);
  const current = (existing && Number.isFinite(existing.seq)) ? existing.seq : 0;

  let seq = current;
  if (envelope.start_seq === current) {
    seq = envelope.end_seq;
    await persistCheckpoint(id, existing, seq);
  }
  return sealCheckpoint(keys, envelope.user, envelope.device_id, seq);
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

// Resolves both halves of the per-(user, device) key material: the device's registered public keys
// from the _users doc, and the server's private keys for that device from the secureSettings
// vault. Either being absent means the server never registered this device.
const getKeys = async (envelope) => {
  const { user, device_id: deviceId } = envelope;
  const userDoc = await getUserDoc(user);
  const deviceEntry = userDoc?.keys_by_device?.[deviceId];
  const serverPrivateKeys = await serverKey.getServerPrivateKeys(user, deviceId);

  // The caller gets one error either way, but log which half is missing so this is debuggable.
  if (!deviceEntry?.signing_public_key || !deviceEntry?.encryption_public_key) {
    logger.error(`offline-data-bundle: no registered device keys for ${user}/${deviceId}.`);
  }
  if (!serverPrivateKeys?.encryption || !serverPrivateKeys?.signing) {
    logger.error(`offline-data-bundle: no server key material for ${user}/${deviceId}.`);
  }
  if (!deviceEntry?.signing_public_key || !deviceEntry?.encryption_public_key ||
      !serverPrivateKeys?.encryption || !serverPrivateKeys?.signing) {
    throw new BadRequestError('Unknown device.');
  }

  return {
    deviceSigningKey: deviceEntry.signing_public_key,
    deviceEncryptionKey: deviceEntry.encryption_public_key,
    serverEncryptionKey: serverPrivateKeys.encryption,
    serverSigningKey: serverPrivateKeys.signing,
  };
};

// The envelope carries the payload's digest, so verifying the signature also pins the body. This
// runs BEFORE the body is touched: an unsigned or misattributed bundle costs us nothing.
const verifyEnvelope = async (keys, envelopeBytes, signature) => {
  if (!(await signing.verify(keys.deviceSigningKey, signature, envelopeBytes))) {
    throw new BadRequestError('Bad signature.');
  }
};

const assertPayloadMatchesEnvelope = (envelope, digest) => {
  const actual = digest.hash.digest('base64');
  if (actual !== envelope.payload_sha256 || digest.bytes !== envelope.payload_bytes) {
    throw new BadRequestError('Payload does not match the envelope.');
  }
};

const unpack = async (keys, envelope, body) => {
  const digest = { hash: crypto.createHash('sha256'), bytes: 0 };
  let docs;
  try {
    const ciphertext = digestingStream(body, digest, envelope.payload_bytes);
    const plaintext = await age.decryptStream(keys.serverEncryptionKey, ciphertext);
    docs = await readDocs(plaintext);
  } catch (err) {
    if (err instanceof BadRequestError || err instanceof PayloadTooLargeError) {
      throw err;
    }
    logger.warn(
      'offline-data-bundle: failed to decrypt/parse payload for %s/%s: %o',
      envelope.user,
      envelope.device_id,
      err
    );
    throw new BadRequestError('Corrupt payload.');
  }
  // Only once the whole stream has gone by do we know it is the payload the envelope signed.
  // Nothing has been written yet, so a mismatch costs a rejection and no cleanup.
  assertPayloadMatchesEnvelope(envelope, digest);
  return docs;
};

module.exports = {
  // Processes ONE bundle. `encodedEnvelope` and `signature` are the raw request header values and
  // `body` is the request stream carrying the age ciphertext. Throws with an HTTP `code` when the
  // bundle cannot be trusted; otherwise ingests the docs and returns the sealed checkpoint.
  process: async (encodedEnvelope, signature, req) => {
    const { envelope, envelopeBytes } = unpackHeaders(encodedEnvelope, signature);
    checkDeclaredSize(req, envelope);

    const keys = await getKeys(envelope);
    await verifyEnvelope(keys, envelopeBytes, signature);
    const userCtx = await getOfflineUserCtx(envelope.user);

    const docs = await unpack(keys, envelope, req);
    const { accepted, rejected } = await ingest(userCtx, docs);
    const checkpoint = await settleCheckpoint(keys, envelope);

    return { accepted, rejected, checkpoint };
  },
};
