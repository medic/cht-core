const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const { webcrypto, createHash } = require('node:crypto');
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

const toNdjson = (docs) => docs.map(doc => JSON.stringify(doc)).join('\n');

// Age-encrypts the NDJSON to the server's recipient key. age-encryption is
// ESM-only, hence the dynamic import (same package the server uses).
const encryptToServer = async (serverKey, ndjson) => {
  const { Encrypter } = await import('age-encryption');
  const encrypter = new Encrypter();
  encrypter.addRecipient(serverKey);
  return encrypter.encrypt(Buffer.from(ndjson, 'utf8'));
};

// Builds the request the way a relaying device does: the envelope pins the body with its sha256,
// the signature covers the envelope alone (so the server can check it before reading a single
// body byte), and the ciphertext travels as the raw octet-stream body.
const buildSignedRequest = async ({ envelope, ciphertext, privateKey }) => {
  const payloadBytes = Buffer.from(ciphertext);
  const fullEnvelope = {
    ...envelope,
    payload_sha256: createHash('sha256').update(payloadBytes).digest('base64'),
    payload_bytes: payloadBytes.length,
  };
  // the signed message is exactly the bytes that travel in the header, no canonical form involved
  const envelopeBytes = Buffer.from(JSON.stringify(fullEnvelope), 'utf8');
  const signature = Buffer.from(await webcrypto.subtle.sign({ name: 'Ed25519' }, privateKey, envelopeBytes));

  return {
    path: '/api/v1/replication/data-bundle',
    method: 'POST',
    auth: { username: 'bundletaxi', password },
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Medic-Bundle-Envelope': envelopeBytes.toString('base64'),
      'X-Medic-Bundle-Signature': signature.toString('base64'),
    },
    body: payloadBytes,
  };
};

describe('offline data-bundle handler', () => {
  let serverKey;
  let signingKeyJwk;
  let privateKey;

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

    // Register the CHW device (as admin) and capture the server's age recipient for this device,
    // which is what the bundles are encrypted to.
    const deviceKeyResponse = await utils.request({
      path: `/api/v1/users/bundlechw/devices/${DEVICE_ID}/keys`,
      method: 'POST',
      body: { signing_key: signingKeyJwk },
    });
    serverKey = deviceKeyResponse.server_encryption_public_key;
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(users);
  });

  it('ingests an authorized doc with original rev, rejects out-of-scope docs, dedupes on replay', async () => {
    const ciphertext = await encryptToServer(serverKey, toNdjson([allowedDoc, deniedDoc]));
    const envelope = { user: 'bundlechw', device_id: DEVICE_ID, bundle_seq: 1 };
    const requestOptions = await buildSignedRequest({ envelope, ciphertext, privateKey });

    // First relay: the authorized doc is ingested and the out-of-scope doc dropped. The relaying
    // device is told nothing about either, since it cannot read the bundle.
    const firstResponse = await utils.request(requestOptions);
    chai.expect(firstResponse).to.deep.equal({ ok: true });

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

    // Replay the identical bundle: CouchDB revision dedup means no conflict and no rev change.
    chai.expect(await utils.request(requestOptions)).to.deep.equal({ ok: true });

    const afterReplay = await utils.getDoc('bundle_allowed_report', '', '?conflicts=true');
    chai.expect(afterReplay._rev).to.equal(CLIENT_REV);
    chai.expect(afterReplay._conflicts).to.equal(undefined);
  });

  it('rejects a body that does not match the signed envelope', async () => {
    const ciphertext = await encryptToServer(serverKey, toNdjson([allowedDoc]));
    const envelope = { user: 'bundlechw', device_id: DEVICE_ID, bundle_seq: 2 };
    const requestOptions = await buildSignedRequest({ envelope, ciphertext, privateKey });
    // swap the body for a different (valid, and validly encrypted) payload, leaving the signed
    // envelope untouched: the sha256 in the envelope no longer describes what arrived.
    requestOptions.body = Buffer.from(await encryptToServer(serverKey, toNdjson([deniedDoc])));

    const error = await utils.request(requestOptions).catch(err => err);
    chai.expect(error.status).to.equal(400);
  });
});
