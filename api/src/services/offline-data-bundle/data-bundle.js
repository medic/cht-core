const logger = require('@medic/logger');
const db = require('../../db');
const auth = require('../../auth');
const age = require('./age');
const signing = require('./signing');
const serverKey = require('./server-key');
const bulkDocsService = require('../replication/bulk-docs');

const USER_DOC_PREFIX = 'org.couchdb.user:';
const CHECKPOINT_PREFIX = '_local/offline-checkpoint:';

// ---------------------------------------------------------------------------
// Canonicalisation contract (the client MUST match this byte-for-byte).
//
// The signed message is:
//   Buffer.concat([ Buffer.from(canonicalEnvelope, 'utf8'), payloadBytes ])
// where:
//   - canonicalEnvelope = a JSON.stringify of the envelope with object keys
//     emitted in a STABLE (lexicographically sorted) order at every level.
//     Sorting removes the ambiguity of insertion-order so the server and the
//     signing device always hash the exact same bytes.
//   - payloadBytes = Buffer.from(payload, 'base64') (the raw age ciphertext).
//
// `canonicalize` recurses so nested objects are also key-sorted; arrays keep
// their order (order is meaningful in an array). Any non-object/array value is
// serialised by JSON.stringify as-is.
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
    Number.isFinite(envelope.bundle_seq) &&
    Number.isFinite(envelope.start_seq) &&
    Number.isFinite(envelope.end_seq);
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

const parseNdjson = (bytes) => {
  const text = Buffer.from(bytes).toString('utf8');
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line));
};

// Builds the CHW's userCtx the same way the session middleware does: from the
// username, `auth.getUserSettings` reads the _users doc (for roles) and the
// medic user-settings doc, then hydrates facility_id/contact_id onto it.
const buildUserCtx = async (username) => auth.getUserSettings({ name: username });

// Ingest with new_edits:false to preserve the CHW's original revisions. The design relies on
// CouchDB's revision-based dedup so a doc arriving via both P2P and direct sync does not
// duplicate or conflict. Under new_edits:false CouchDB only returns entries for docs that
// FAILED, so accepted = total - errors.
const writeDocs = async (docs) => {
  const results = await db.medic.bulkDocs(docs, { new_edits: false });
  const errors = (results || []).filter(result => result?.error).length;
  return docs.length - errors;
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

// ---------------------------------------------------------------------------
// Contiguity contract (ratified: INGEST-ALL, CHECKPOINT-CONTIGUOUS).
//
// Every successfully verified+decrypted+validated bundle is ingested,
// regardless of sequence gaps. The checkpoint, however, only advances through
// the CONTIGUOUS run of ingested bundles starting from the stored checkpoint:
//
//   start from the stored checkpoint (0 if none). Repeatedly look for an
//   ingested bundle whose `start_seq === currentCheckpoint`; if found, advance
//   `currentCheckpoint = bundle.end_seq` and repeat. Stop at the first gap.
//
// A missing / failed / out-of-order bundle simply parks the checkpoint below
// the gap. Its docs may already be ingested, but the checkpoint will not cross
// the gap until the bundle that fills it arrives in a later request.
// ---------------------------------------------------------------------------
const advanceCheckpoint = (startCheckpoint, ingestedBundles) => {
  let checkpoint = startCheckpoint;
  const remaining = [...ingestedBundles];
  let advanced = true;
  while (advanced) {
    advanced = false;
    const nextIndex = remaining.findIndex(bundle => bundle.start_seq === checkpoint);
    if (nextIndex !== -1) {
      checkpoint = remaining[nextIndex].end_seq;
      remaining.splice(nextIndex, 1);
      advanced = true;
    }
  }
  return checkpoint;
};

const persistCheckpoint = async (id, existing, checkpoint) => {
  const doc = { _id: id, seq: checkpoint };
  if (existing?._rev) {
    doc._rev = existing._rev;
  }
  await db.medic.put(doc);
};

const rejected = (envelope, reason) => ({
  user: envelope?.user,
  device_id: envelope?.device_id,
  bundle_seq: envelope?.bundle_seq,
  status: 'rejected',
  reason,
});

// Processes a single bundle in isolation. Never throws for one bad bundle -
// any failure becomes a `rejected` result so the rest of the batch proceeds.
// Verifies the bundle signature and decrypts its payload. Returns `{ docs }` on success, or
// `{ reason }` naming why the bundle was rejected. The server's PRIVATE decryption key for this
// device lives in the secureSettings vault, keyed by (user, device_id); its absence means the
// server never registered keys for this device, so we cannot decrypt and treat it as unknown.
const verifyAndDecrypt = async (envelope, payload, signature, deviceEntry) => {
  const payloadBytes = Buffer.from(payload || '', 'base64');
  const message = Buffer.concat([Buffer.from(canonicalize(envelope), 'utf8'), payloadBytes]);
  if (!(await signing.verify(deviceEntry.signing_public_key, signature, message))) {
    return { reason: 'bad signature' };
  }

  const serverPrivateKeys = await serverKey.getServerPrivateKeys(envelope.user, envelope.device_id);
  if (!serverPrivateKeys?.encryption) {
    return { reason: 'unknown device' };
  }

  try {
    const plaintext = await age.decrypt(serverPrivateKeys.encryption, payloadBytes);
    return { docs: parseNdjson(plaintext) };
  } catch (err) {
    logger.warn(
      'offline-data-bundle: failed to decrypt/parse payload for %s/%s: %o',
      envelope.user,
      envelope.device_id,
      err
    );
    return { reason: 'corrupt payload' };
  }
};

const processBundle = async (bundle) => {
  const { envelope, payload, signature } = bundle || {};
  if (!isValidEnvelope(envelope)) {
    return rejected(envelope, 'invalid envelope');
  }

  const userDoc = await getUserDoc(envelope.user);
  const deviceEntry = userDoc?.keys_by_device?.[envelope.device_id];
  if (!deviceEntry) {
    return rejected(envelope, 'unknown device');
  }

  const unpacked = await verifyAndDecrypt(envelope, payload, signature, deviceEntry);
  if (unpacked.reason) {
    return rejected(envelope, unpacked.reason);
  }

  const userCtx = await buildUserCtx(envelope.user);
  const allowedDocs = await bulkDocsService.filterOfflineRequest(userCtx, unpacked.docs);
  const accepted = allowedDocs.length ? await writeDocs(allowedDocs) : 0;

  return {
    user: envelope.user,
    device_id: envelope.device_id,
    bundle_seq: envelope.bundle_seq,
    start_seq: envelope.start_seq,
    end_seq: envelope.end_seq,
    status: 'ingested',
    accepted,
    rejected: unpacked.docs.length - accepted,
  };
};

const groupKey = (result) => `${result.user} ${result.device_id}`;

// Groups ingested bundles per (user, device) so each group settles one checkpoint.
const groupByDevice = (ingested) => {
  const groups = new Map();
  for (const result of ingested) {
    const key = groupKey(result);
    if (!groups.has(key)) {
      groups.set(key, { user: result.user, device_id: result.device_id, bundles: [] });
    }
    groups.get(key).bundles.push(result);
  }
  return groups;
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
//
// The server signing private key and the device encryption public key are an
// invariant here: this group came from ingested bundles, which only ingest when
// the device and its keys were present.
// ---------------------------------------------------------------------------
const sealCheckpoint = async (user, deviceId, seq) => {
  const serverPrivateKeys = await serverKey.getServerPrivateKeys(user, deviceId);
  const userDoc = await getUserDoc(user);
  const deviceEntry = userDoc.keys_by_device[deviceId];

  const inner = { seq, user, device_id: deviceId };
  const innerBytes = Buffer.from(JSON.stringify(inner), 'utf8');
  const signature = await signing.sign(serverPrivateKeys.signing, innerBytes);
  const signed = Buffer.from(JSON.stringify({ checkpoint: inner, signature }), 'utf8');
  const ciphertext = await age.encrypt(deviceEntry.encryption_public_key, signed);
  return Buffer.from(ciphertext).toString('base64');
};

// Advances and persists one (user, device) checkpoint through its contiguous run, returning the
// aggregate result for that device. The _local checkpoint doc keeps the plain numeric seq; the
// `checkpoint` returned to the caller is the sealed token (see sealCheckpoint).
const settleCheckpoint = async (group) => {
  const id = `${CHECKPOINT_PREFIX}${group.user}:${group.device_id}`;
  const existing = await readCheckpointDoc(id);
  const startCheckpoint = (existing && Number.isFinite(existing.seq)) ? existing.seq : 0;
  const seq = advanceCheckpoint(startCheckpoint, group.bundles);
  await persistCheckpoint(id, existing, seq);
  const checkpoint = await sealCheckpoint(group.user, group.device_id, seq);

  return {
    user: group.user,
    device_id: group.device_id,
    checkpoint,
    accepted: group.bundles.reduce((sum, bundle) => sum + bundle.accepted, 0),
    rejected: group.bundles.reduce((sum, bundle) => sum + bundle.rejected, 0),
  };
};

module.exports = {
  // Processes an array of `{ envelope, payload, signature }` bundles.
  // Ingests every valid bundle; advances a per-(user, device) checkpoint
  // through the contiguous run only. Returns one aggregate result per
  // (user, device) ingested, plus each rejected bundle surfaced individually.
  process: async (bundles = []) => {
    const perBundle = [];
    for (const bundle of bundles) {
      try {
        perBundle.push(await processBundle(bundle));
      } catch (err) {
        logger.error('offline-data-bundle: unexpected error processing bundle: %o', err);
        perBundle.push(rejected(bundle?.envelope, 'processing error'));
      }
    }

    const ingested = perBundle.filter(result => result.status === 'ingested');
    const rejections = perBundle.filter(result => result.status === 'rejected');

    const results = [];
    for (const group of groupByDevice(ingested).values()) {
      results.push(await settleCheckpoint(group));
    }
    // Surface per-bundle rejections alongside the per-device aggregates.
    results.push(...rejections);

    return { results };
  },
};
