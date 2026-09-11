const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { ReadableStream } = require('node:stream/web');
const logger = require('@medic/logger');
const db = require('../../db');
const auth = require('../../auth');
const age = require('./age');
const signing = require('./signing');
const serverKey = require('./server-key');
const bulkDocsService = require('../replication/bulk-docs');

const USER_DOC_PREFIX = 'org.couchdb.user:';
const CHECKPOINT_PREFIX = '_local/offline-checkpoint:';
// Docs are written to CouchDB in chunks so a single bulkDocs call stays bounded. This splits only
// the WRITES: authorization runs once over the whole set (see ingest), because the offline filter
// is not safe to feed in pieces.
const WRITE_BATCH_SIZE = 100;

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
// The signed message is utf8(canonicalEnvelope) and NOTHING else. The envelope binds itself to
// the body through `payload_sha256`, so the signature still covers the payload transitively while
// staying verifiable before a single body byte is read.
//
// canonicalEnvelope = JSON.stringify of the envelope with object keys emitted in a STABLE
// (lexicographically sorted) order at every level. Sorting removes the ambiguity of
// insertion-order so the server and the signing device always hash the exact same bytes.
// `canonicalize` recurses so nested objects are also key-sorted; arrays keep their order.
// ---------------------------------------------------------------------------
// Keys sort by UTF-16 code unit, NOT localeCompare: the client and the server must
// produce byte-identical canonical forms for the signature to verify, and locale
// collation varies by platform and locale.
const byCodeUnit = (a, b) => {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
};

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object
      .keys(value)
      .sort(byCodeUnit)
      .map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

const isValidEnvelope = (envelope) => {
  return !!envelope &&
    typeof envelope === 'object' &&
    isNonEmptyString(envelope.user) &&
    isNonEmptyString(envelope.device_id) &&
    isNonEmptyString(envelope.payload_sha256) &&
    Number.isFinite(envelope.bundle_seq) &&
    Number.isFinite(envelope.start_seq) &&
    Number.isFinite(envelope.end_seq) &&
    Number.isFinite(envelope.payload_bytes);
};

const rejection = (code, reason) => {
  const err = new Error(reason);
  err.code = code;
  return err;
};

// Reads the per-user _users doc. Device PUBLIC keys are stored on THIS doc (not the medic
// user-settings doc) under `keys_by_device`, keyed by device_id, by the device-key endpoint (#11278).
const getUserDoc = async (username) => {
  try {
    return await db.users.get(`${USER_DOC_PREFIX}${username}`);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

// Builds the CHW's userCtx the same way the session middleware does: from the
// username, `auth.getUserSettings` reads the _users doc (for roles) and the
// medic user-settings doc, then hydrates facility_id/contact_id onto it.
const buildUserCtx = async (username) => auth.getUserSettings({ name: username });

// ---------------------------------------------------------------------------
// Streaming ingest.
//
// The request body is piped straight into age, so the ciphertext is never held whole. On the way
// past, every byte feeds a sha256 and a length counter that are checked against the envelope once
// the stream ends. Nothing is written before that check passes.
// ---------------------------------------------------------------------------
const digestingStream = (body, digest) => {
  const readable = typeof body?.pipe === 'function' ? body : Readable.from(body);
  const chunks = readable[Symbol.asyncIterator]();
  // `pull` is only called when age asks for more, so the request keeps its backpressure.
  return new ReadableStream({
    pull: async (controller) => {
      const { value, done } = await chunks.next();
      if (done) {
        return controller.close();
      }
      digest.hash.update(value);
      digest.bytes += value.length;
      controller.enqueue(new Uint8Array(value));
    },
    cancel: () => readable.destroy(),
  });
};

// Reads the decrypted stream as NDJSON. Lines straddle chunk boundaries, so a carry buffer holds
// the partial trailing line until the next chunk completes it.
const readDocs = async (plaintext) => {
  const reader = plaintext.getReader();
  const decoder = new TextDecoder();
  const docs = [];
  let carry = '';

  const pushLine = (line) => {
    if (line.trim().length) {
      docs.push(JSON.parse(line));
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    carry += decoder.decode(value, { stream: true });
    const lines = carry.split('\n');
    carry = lines.pop();
    lines.forEach(pushLine);
  }
  pushLine(carry + decoder.decode());
  return docs;
};

const decryptDocs = async (identity, body, digest) => {
  const plaintext = await age.decryptStream(identity, digestingStream(body, digest));
  return readDocs(plaintext);
};

// Ingest with new_edits:false to preserve the CHW's original revisions. The design relies on
// CouchDB's revision-based dedup so a doc arriving via both P2P and direct sync does not
// duplicate or conflict. Under new_edits:false CouchDB only returns entries for docs that
// FAILED, so accepted = total - errors.
const writeDocs = async (docs) => {
  let accepted = 0;
  for (let i = 0; i < docs.length; i += WRITE_BATCH_SIZE) {
    const batch = docs.slice(i, i + WRITE_BATCH_SIZE);
    const results = await db.medic.bulkDocs(batch, { new_edits: false });
    accepted += batch.length - (results || []).filter(result => result?.error).length;
  }
  return accepted;
};

// Authorization runs ONCE over the whole doc set on purpose. `filterAllowedDocs` iterates until
// the authorization context stops growing, so a report can become allowed on a later pass because
// the contact granting access to it sits further down the array. Filtering chunk by chunk would
// silently drop those docs.
const ingest = async (username, docs) => {
  const userCtx = await buildUserCtx(username);
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

// Resolves both halves of the per-(user, device) key material: the device's registered public keys
// from the _users doc, and the server's private keys for that device from the secureSettings
// vault. Either being absent means the server never registered this device.
const getKeys = async (envelope) => {
  const userDoc = await getUserDoc(envelope.user);
  const deviceEntry = userDoc?.keys_by_device?.[envelope.device_id];
  const serverPrivateKeys = deviceEntry &&
    await serverKey.getServerPrivateKeys(envelope.user, envelope.device_id);
  if (!deviceEntry || !serverPrivateKeys?.encryption) {
    throw rejection(403, 'Unknown device.');
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
const verifyEnvelope = async (keys, envelope, signature) => {
  const message = Buffer.from(canonicalize(envelope), 'utf8');
  if (!(await signing.verify(keys.deviceSigningKey, signature, message))) {
    throw rejection(403, 'Bad signature.');
  }
};

const assertPayloadMatchesEnvelope = (envelope, digest) => {
  const actual = digest.hash.digest('base64');
  if (actual !== envelope.payload_sha256 || digest.bytes !== envelope.payload_bytes) {
    throw rejection(400, 'Payload does not match the envelope.');
  }
};

const unpack = async (keys, envelope, body) => {
  const digest = { hash: crypto.createHash('sha256'), bytes: 0 };
  let docs;
  try {
    docs = await decryptDocs(keys.serverEncryptionKey, body, digest);
  } catch (err) {
    logger.warn(
      'offline-data-bundle: failed to decrypt/parse payload for %s/%s: %o',
      envelope.user,
      envelope.device_id,
      err
    );
    throw rejection(400, 'Corrupt payload.');
  }
  // Only once the whole stream has gone by do we know it is the payload the envelope signed.
  // Nothing has been written yet, so a mismatch costs a rejection and no cleanup.
  assertPayloadMatchesEnvelope(envelope, digest);
  return docs;
};

module.exports = {
  // Processes ONE bundle: `envelope` and `signature` come from the request headers, `body` is the
  // raw age ciphertext stream. Throws a rejection carrying an HTTP `code` when the bundle cannot be
  // trusted; otherwise ingests the docs and returns the sealed checkpoint for the peer device.
  process: async (envelope, signature, body) => {
    if (!isValidEnvelope(envelope)) {
      throw rejection(400, 'Invalid envelope.');
    }

    const keys = await getKeys(envelope);
    await verifyEnvelope(keys, envelope, signature);

    const docs = await unpack(keys, envelope, body);
    const { accepted, rejected } = await ingest(envelope.user, docs);
    const checkpoint = await settleCheckpoint(keys, envelope);

    return {
      user: envelope.user,
      device_id: envelope.device_id,
      bundle_seq: envelope.bundle_seq,
      start_seq: envelope.start_seq,
      end_seq: envelope.end_seq,
      accepted,
      rejected,
      checkpoint,
    };
  },
};
