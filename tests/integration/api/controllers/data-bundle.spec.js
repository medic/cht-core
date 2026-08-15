const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const { webcrypto } = require('node:crypto');
const utils = require('@utils');
const sUtils = require('@utils/sentinel');
const { CONTACT_TYPES, DOC_TYPES } = require('@medic/constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: CONTACT_TYPES.DISTRICT_HOSPITAL,
  name: 'Big Parent Hospital',
};

// One offline CHW (the "peer" whose docs travel in the bundle) and one online
// "taxi" that has the relay permission and actually POSTs the bundle.
const users = [
  {
    username: 'bundlechw',
    password,
    place: {
      _id: 'fixture:bundlechw',
      type: CONTACT_TYPES.HEALTH_CENTER,
      name: 'CHW place',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:bundlechw',
    },
    contact: {
      _id: 'fixture:user:bundlechw',
      name: 'BundleCHW',
      patient_id: 'shortcode:user:bundlechw',
    },
    roles: ['chw'],
  },
  {
    username: 'bundletaxi',
    password,
    place: {
      _id: 'fixture:bundletaxi',
      type: CONTACT_TYPES.HEALTH_CENTER,
      name: 'Taxi place',
      parent: 'PARENT_PLACE',
      place_id: 'shortcode:bundletaxi',
    },
    contact: {
      _id: 'fixture:user:bundletaxi',
      name: 'BundleTaxi',
      patient_id: 'shortcode:user:bundletaxi',
    },
    roles: ['taxi'],
  },
];

const DEVICE_ID = 'device-bundlechw-1';

// A crafted, client-style revision (as PouchDB replication produces). A normal
// server write would generate `1-<md5hash>`; asserting the doc keeps THIS exact
// rev proves the ingest ran with `new_edits:false`.
const CLIENT_REV_ID = 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5';
const CLIENT_REV = `1-${CLIENT_REV_ID}`;

// A doc the CHW is authorized to write: a report whose subject is the CHW's own
// place, submitted by the CHW's own contact.
const allowedDoc = {
  _id: 'bundle_allowed_report',
  _rev: CLIENT_REV,
  _revisions: { start: 1, ids: [CLIENT_REV_ID] },
  type: DOC_TYPES.DATA_RECORD,
  form: 'form',
  contact: { _id: 'fixture:user:bundlechw' },
  fields: { place_id: 'shortcode:bundlechw' },
  reported_date: 1,
};

// A doc the CHW is NOT authorized to write: its subject is an unknown place, so
// the offline write-authz pipeline must reject it even though the signature and
// decryption succeed.
const deniedDoc = {
  _id: 'bundle_denied_report',
  _rev: CLIENT_REV,
  _revisions: { start: 1, ids: [CLIENT_REV_ID] },
  type: DOC_TYPES.DATA_RECORD,
  form: 'form',
  contact: { _id: 'fixture:user:bundlechw' },
  fields: { place_id: 'unknown place' },
  reported_date: 1,
};

// Replicates the service's canonicalisation contract byte-for-byte
// (see api/src/services/offline-data-bundle/data-bundle.js). Recursive
// key-sort JSON; arrays keep order.
const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object
      .keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

const toNdjson = (docs) => docs.map(doc => JSON.stringify(doc)).join('\n');

// Age-encrypts the NDJSON to the server's recipient key. age-encryption is
// ESM-only, hence the dynamic import (same package the server uses).
const encryptToServer = async (serverKey, ndjson) => {
  const { Encrypter } = await import('age-encryption');
  const encrypter = new Encrypter();
  encrypter.addRecipient(serverKey);
  return encrypter.encrypt(Buffer.from(ndjson, 'utf8'));
};

// Generates an age identity + its recipient string. The recipient is registered as the device's
// encryption_key; the identity is kept so the test can decrypt the SEALED checkpoint token the
// server returns (the server encrypts the checkpoint to that recipient).
const generateAgeKeys = async () => {
  const age = await import('age-encryption');
  const identity = await age.generateIdentity();
  return { identity, recipient: await age.identityToRecipient(identity) };
};

// Decrypts age ciphertext with the given identity, returning the plaintext bytes.
const decryptWithIdentity = async (identity, ciphertext) => {
  const { Decrypter } = await import('age-encryption');
  const decrypter = new Decrypter();
  decrypter.addIdentity(identity);
  return decrypter.decrypt(ciphertext, 'uint8array');
};

// Opens a sealed checkpoint token: base64 -> age-decrypt with the device identity -> JSON. Returns
// the { checkpoint, signature } envelope the server sealed.
const openSealedCheckpoint = async (token, identity) => {
  const signedBytes = await decryptWithIdentity(identity, Buffer.from(token, 'base64'));
  return JSON.parse(Buffer.from(signedBytes).toString('utf8'));
};

const buildSignedBundle = async ({ envelope, ciphertext, privateKey }) => {
  const payloadBytes = Buffer.from(ciphertext);
  const message = Buffer.concat([Buffer.from(canonicalize(envelope), 'utf8'), payloadBytes]);
  const signature = Buffer.from(await webcrypto.subtle.sign({ name: 'Ed25519' }, privateKey, message));
  return {
    envelope,
    payload: payloadBytes.toString('base64'),
    signature: signature.toString('base64'),
  };
};

const findAggregate = (results, user) => results.find(
  result => result.user === user && result.device_id === DEVICE_ID && result.checkpoint !== undefined
);

describe('offline data-bundle handler', () => {
  let serverKey;
  let serverSigningPublicKey;
  let signingKeyJwk;
  let privateKey;
  let deviceEncryptionIdentity;

  before(async () => {
    await utils.saveDoc(parentPlace);
    await sUtils.waitForSentinel();
    // Peers need can_send to be provisioned a key; taxis need can_relay to POST bundles.
    await utils.updatePermissions(['chw'], ['can_send_offline_data_bundle'], [], { ignoreReload: true });
    await utils.updatePermissions(['taxi'], ['can_relay_offline_data_bundle'], [], { ignoreReload: true });
    // Register the `taxi` role in settings.roles. Permission checks (hasAnyPermission) discard any
    // role that is not configured in settings.roles, so an unregistered `taxi` role would strip the
    // relay permission and yield a 403. `chw` is already a default configured role. Merge to keep
    // the default roles (and their permissions) intact.
    const currentSettings = await utils.getSettings();
    await utils.updateSettings(
      { roles: { ...currentSettings.roles, taxi: { name: 'usertype.taxi', offline: true } } },
      { ignoreReload: true }
    );
    await utils.createUsers(users);

    // A real Ed25519 signing keypair for the CHW device. The public half is registered as a JWK
    // (the format the device-key endpoint now expects and the service verifies against).
    const keyPair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    privateKey = keyPair.privateKey;
    signingKeyJwk = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey);

    // Register the CHW device (as admin). Keep the device's age identity so we can open the sealed
    // checkpoint, and capture both the server's age recipient (to encrypt bundles to) and the
    // server's signing public key (to verify the sealed checkpoint's signature).
    const { identity, recipient } = await generateAgeKeys();
    deviceEncryptionIdentity = identity;
    const deviceKeyResponse = await utils.request({
      path: `/api/v1/users/bundlechw/devices/${DEVICE_ID}/keys`,
      method: 'POST',
      body: { encryption_key: recipient, signing_key: signingKeyJwk },
    });
    serverKey = deviceKeyResponse.server_encryption_public_key;
    serverSigningPublicKey = deviceKeyResponse.server_signing_public_key;
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(users);
  });

  it('ingests an authorized doc with original rev, rejects out-of-scope docs, dedupes on replay', async () => {
    const ciphertext = await encryptToServer(serverKey, toNdjson([allowedDoc, deniedDoc]));
    const envelope = { user: 'bundlechw', device_id: DEVICE_ID, bundle_seq: 1, start_seq: 0, end_seq: 1 };
    const bundle = await buildSignedBundle({ envelope, ciphertext, privateKey });

    const requestOptions = {
      path: '/api/v1/replication/data-bundle',
      method: 'POST',
      auth: { username: 'bundletaxi', password },
      body: { bundles: [bundle] },
    };

    // First relay: the authorized doc is ingested, the out-of-scope doc rejected,
    // and the per-(user, device) checkpoint advances to end_seq.
    const firstResponse = await utils.request(requestOptions);
    const firstAggregate = findAggregate(firstResponse.results, 'bundlechw');
    // `checkpoint` is now a SEALED token (base64), not the raw number, so assert the rest verbatim
    // and open the token separately.
    chai.expect(firstAggregate).excluding('checkpoint').to.deep.equal({
      user: 'bundlechw',
      device_id: DEVICE_ID,
      accepted: 1,
      rejected: 1,
    });
    chai.expect(firstAggregate.checkpoint).to.be.a('string');

    // Open the sealed checkpoint: age-decrypt with the device identity, verify the server signature
    // over the inner checkpoint bytes with the server's signing public key, and confirm the seq.
    const signed = await openSealedCheckpoint(firstAggregate.checkpoint, deviceEncryptionIdentity);
    const serverVerifyKey = await webcrypto.subtle.importKey(
      'jwk', serverSigningPublicKey, { name: 'Ed25519' }, false, ['verify']
    );
    const innerBytes = Buffer.from(JSON.stringify(signed.checkpoint), 'utf8');
    const validSignature = await webcrypto.subtle.verify(
      { name: 'Ed25519' }, serverVerifyKey, Buffer.from(signed.signature, 'base64'), innerBytes
    );
    chai.expect(validSignature).to.be.true;
    chai.expect(signed.checkpoint).to.deep.equal({ seq: 1, user: 'bundlechw', device_id: DEVICE_ID });

    // The authorized doc exists with its ORIGINAL client rev (proves new_edits:false).
    const stored = await utils.getDoc('bundle_allowed_report', '', '?conflicts=true');
    chai.expect(stored._rev).to.equal(CLIENT_REV);
    chai.expect(stored._conflicts).to.equal(undefined);
    chai.expect(stored).excludingEvery(['_rev', '_revisions', '_conflicts']).to.deep.include({
      _id: 'bundle_allowed_report',
      type: DOC_TYPES.DATA_RECORD,
      form: 'form',
      fields: { place_id: 'shortcode:bundlechw' },
    });

    // The out-of-scope doc was never written.
    const deniedResult = await utils.getDoc('bundle_denied_report').catch(err => err);
    chai.expect(deniedResult).to.include({ status: 404 });

    // Replay the identical bundle: CouchDB revision dedup means no conflict and no
    // rev change; the already-settled checkpoint does not move.
    const secondResponse = await utils.request(requestOptions);
    const secondAggregate = findAggregate(secondResponse.results, 'bundlechw');
    const replaySigned = await openSealedCheckpoint(secondAggregate.checkpoint, deviceEncryptionIdentity);
    chai.expect(replaySigned.checkpoint.seq).to.equal(1);
    chai.expect(secondAggregate.accepted).to.equal(1);

    const afterReplay = await utils.getDoc('bundle_allowed_report', '', '?conflicts=true');
    chai.expect(afterReplay._rev).to.equal(CLIENT_REV);
    chai.expect(afterReplay._conflicts).to.equal(undefined);
  });
});
