const { Readable } = require('node:stream');
const { TransformStream } = require('node:stream/web');
const logger = require('@medic/logger');
const { MAX_REQUEST_SIZE } = require('@medic/constants');
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
const SEND_PERMISSION = 'can_send_offline_data_bundle';

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
// verifies what it received instead of reproducing a canonical form of it.
//
// DOC ORDER IS THE CLIENT'S JOB. Docs are authorized in batches, and a batch can only grant access
// from the docs it contains plus what is already in the database. A report whose contact arrives in
// a LATER batch is therefore dropped and never retried. Packing the docs in the order they changed
// (oldest first) is what avoids this, because the webapp always writes a contact before any report
// that depends on it.
// ---------------------------------------------------------------------------

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

// Content-Length is optional on a streamed request, so it is only worth checking when the caller
// sent one: it lets an oversized bundle be refused from its declared size rather than after we
// have read it. The body is bounded again as it streams for callers that send no length.
const checkDeclaredSize = (req) => {
  if (Number(req.headers['content-length']) > MAX_REQUEST_SIZE) {
    throw new PayloadTooLargeError(`Request body is larger than ${MAX_REQUEST_SIZE} bytes`);
  }
};

// `bundle_seq` is carried for the relay, which uses it to order bundles and spot a gap without
// opening them. The server itself does not act on it, so it is not required here.
const isValidEnvelope = (envelope) => {
  return !!envelope &&
    typeof envelope === 'object' &&
    isNonEmptyString(envelope.user) &&
    isNonEmptyString(envelope.device_id);
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
// facility_id/contact_id onto it. Resolved BEFORE the payload is touched: a user who may not send
// bundles, or who is online-only and so must never be pushed through the offline
// write-authorization pipeline, is cheap to find out about.
const getOfflineUserCtx = async (username) => {
  const userCtx = await auth.getUserSettings({ name: username });
  if (auth.isOnlineOnly(userCtx)) {
    throw new BadRequestError('Bundles can only be ingested for offline users.');
  }
  if (!auth.hasAllPermissions(userCtx, [SEND_PERMISSION])) {
    throw new BadRequestError('This user cannot send offline data bundles.');
  }
  return userCtx;
};

// ---------------------------------------------------------------------------
// Streaming ingest.
//
// The request body is piped straight into age, so the ciphertext is never held whole, and the docs
// it decrypts to are written as they arrive.
// ---------------------------------------------------------------------------

// Stops as soon as the body outgrows the cap, rather than reading on through a body that is
// already known to be too large.
const boundedStream = (body, maxBytes) => {
  let bytes = 0;
  return Readable
    .toWeb(body)
    .pipeThrough(new TransformStream({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) {
          throw new PayloadTooLargeError(`Request body is larger than ${maxBytes} bytes`);
        }
        controller.enqueue(chunk);
      },
    }), { preventCancel: true });
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
  const [deviceSigningKey, serverEncryptionKey] = await Promise.all([
    getUserDoc(user).then(userDoc => userDoc?.keys_by_device?.[deviceId]?.signing_public_key),
    serverKey.getServerPrivateKey(user, deviceId)
  ]);

  // The caller gets one error either way, but log which half is missing so this is debuggable.
  if (!deviceSigningKey || !serverEncryptionKey) {
    if (!deviceSigningKey) {
      logger.error(`offline-data-bundle: no registered device key for ${user}/${deviceId}.`);
    }
    if (!serverEncryptionKey) {
      logger.error(`offline-data-bundle: no server key material for ${user}/${deviceId}.`);
    }
    throw new BadRequestError('Unknown device.');
  }

  return { deviceSigningKey, serverEncryptionKey };
};

// Runs BEFORE the body is touched: an unsigned or misattributed bundle costs us nothing.
const verifyEnvelope = async (keys, envelopeBytes, signature) => {
  if (!(await signing.verify(keys.deviceSigningKey, signature, envelopeBytes))) {
    throw new BadRequestError('Bad signature.');
  }
};

const decrypt = async (identity, encryptedReadStream, envelope) => {
  try {
    return await age.decryptStream(identity, encryptedReadStream);
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
    checkDeclaredSize(req);

    const keys = await getKeys(envelope);
    await verifyEnvelope(keys, envelopeBytes, signature);
    const userCtx = await getOfflineUserCtx(envelope.user);

    const encryptedReadStream = boundedStream(req, MAX_REQUEST_SIZE);
    const plaintext = await decrypt(keys.serverEncryptionKey, encryptedReadStream, envelope);
    const { total, dropped } = await ingest(userCtx, plaintext, envelope);

    // The peer is not told which docs were dropped: the relay carrying this response cannot read
    // the bundle, and has no business learning what was in it.
    if (dropped) {
      logger.warn(
        `offline-data-bundle: dropped ${dropped} of ${total} docs for ${envelope.user}/${envelope.device_id}.`
      );
    }
  },
};
