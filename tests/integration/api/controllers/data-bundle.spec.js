const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);
const { expect } = chai;
const { webcrypto } = require('node:crypto');
const utils = require('@utils');
const userFactory = require('@factories/cht/users/users');
const { CONTACT_TYPES, DOC_TYPES } = require('@medic/constants');

const password = 'passwordSUP3RS3CR37!';

const parentPlace = {
  _id: 'PARENT_PLACE',
  type: CONTACT_TYPES.DISTRICT_HOSPITAL,
  name: 'Big Parent Hospital',
};

// One offline CHW (the "peer" whose docs travel in the bundle) and one online
// "taxi" that has the relay permission and actually POSTs the bundle.
const chwUser = userFactory.build({
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
});

const taxiUser = userFactory.build({
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
});

const users = [chwUser, taxiUser];

const DEVICE_ID = 'device-bundlechw-1';

// A crafted, client-style revision (as PouchDB replication produces). A normal
// server write would generate `1-<md5hash>`; asserting the doc keeps THIS exact
// rev proves the ingest ran with `new_edits:false`.
const CLIENT_REV_ID = 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5';
const CLIENT_REV = `1-${CLIENT_REV_ID}`;

// A doc the CHW is authorized to write: a report whose subject is the CHW's own
// place, submitted by the CHW's own contact.
const reportFor = (id) => ({
  _id: id,
  _rev: CLIENT_REV,
  _revisions: { start: 1, ids: [CLIENT_REV_ID] },
  type: DOC_TYPES.DATA_RECORD,
  form: 'form',
  contact: { _id: 'fixture:user:bundlechw' },
  fields: { place_id: 'shortcode:bundlechw' },
  reported_date: 1,
});

const allowedDoc = reportFor('bundle_allowed_report');

// A doc the CHW is NOT authorized to write: its subject is an unknown place, so
// the offline write-authz pipeline must reject it even though the signature and
// decryption succeed.
const deniedDoc = {
  ...reportFor('bundle_denied_report'),
  fields: { place_id: 'unknown place' },
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

// Builds the request the way a relaying device does: the signature covers the envelope alone, so
// the server can check it before reading a single body byte, and the ciphertext travels as the raw
// octet-stream body.
const buildSignedRequest = async ({ envelope, ciphertext, privateKey, auth }) => {
  // the signed message is exactly the bytes that travel in the header, no canonical form involved
  const envelopeBytes = Buffer.from(JSON.stringify(envelope), 'utf8');
  const signature = Buffer.from(await webcrypto.subtle.sign({ name: 'Ed25519' }, privateKey, envelopeBytes));

  return {
    path: '/api/v1/replication/data-bundle',
    method: 'POST',
    auth: auth || { username: 'bundletaxi', password },
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Medic-Bundle-Envelope': envelopeBytes.toString('base64'),
      'X-Medic-Bundle-Signature': signature.toString('base64'),
    },
    body: Buffer.from(ciphertext),
  };
};

// Registers a device for a user (as admin) and returns the keys a bundle from that device needs:
// the device's own signing private key and the server's age recipient for that device.
const registerDevice = async (username, deviceId) => {
  const keyPair = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const response = await utils.request({
    path: `/api/v1/users/${username}/devices/${deviceId}/keys`,
    method: 'POST',
    body: { signing_key: await webcrypto.subtle.exportKey('jwk', keyPair.publicKey) },
  });
  return { privateKey: keyPair.privateKey, serverKey: response.server_encryption_public_key };
};

describe('offline data-bundle handler', () => {
  let chwDevice;
  let taxiDevice;

  const bundleRequest = async (docs, overrides = {}) => {
    const device = overrides.device || chwDevice;
    const ciphertext = await encryptToServer(device.serverKey, toNdjson(docs));
    return buildSignedRequest({
      envelope: { user: 'bundlechw', device_id: DEVICE_ID, bundle_seq: 1, ...overrides.envelope },
      ciphertext,
      privateKey: device.privateKey,
      auth: overrides.auth,
    });
  };

  before(async () => {
    await utils.saveDoc(parentPlace);
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

    chwDevice = await registerDevice('bundlechw', DEVICE_ID);
    // The taxi gets a device too, so a bundle claiming to come from it is signed and decryptable
    // and therefore reaches the permission check rather than failing as an unknown device.
    taxiDevice = await registerDevice('bundletaxi', DEVICE_ID);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers(users);
  });

  it('ingests an authorized doc with original rev, rejects out-of-scope docs, dedupes on replay', async () => {
    const requestOptions = await bundleRequest([allowedDoc, deniedDoc]);

    // First relay: the authorized doc is ingested and the out-of-scope doc dropped. The relaying
    // device is told nothing about either, since it cannot read the bundle.
    const firstResponse = await utils.request(requestOptions);
    expect(firstResponse).to.deep.equal({ ok: true });

    // The authorized doc exists with its ORIGINAL client rev (proves new_edits:false).
    const stored = await utils.getDoc('bundle_allowed_report', '', '?conflicts=true');
    expect(stored._rev).to.equal(CLIENT_REV);
    expect(stored._conflicts).to.equal(undefined);
    expect(stored).excludingEvery(['_rev', '_revisions', '_conflicts']).to.deep.include({
      _id: 'bundle_allowed_report',
      type: DOC_TYPES.DATA_RECORD,
      form: 'form',
      fields: { place_id: 'shortcode:bundlechw' },
    });

    // The out-of-scope doc was never written.
    const deniedResult = await utils.getDoc('bundle_denied_report').catch(err => err);
    expect(deniedResult).to.include({ status: 404 });

    // Replay the identical bundle: CouchDB revision dedup means no conflict and no rev change.
    expect(await utils.request(requestOptions)).to.deep.equal({ ok: true });

    const afterReplay = await utils.getDoc('bundle_allowed_report', '', '?conflicts=true');
    expect(afterReplay._rev).to.equal(CLIENT_REV);
    expect(afterReplay._conflicts).to.equal(undefined);
  });

  it('writes every doc of a bundle that spans more than one ingest batch', async () => {
    const docs = Array.from({ length: 150 }, (unused, i) => reportFor(`bundle_batched_report_${i}`));
    const requestOptions = await bundleRequest(docs, { envelope: { bundle_seq: 2 } });

    expect(await utils.request(requestOptions)).to.deep.equal({ ok: true });

    const stored = await utils.getDocs(docs.map(doc => doc._id));
    stored.forEach((doc, i) => {
      expect(doc, `${docs[i]._id} was not written`).to.not.be.undefined;
      expect(doc._rev).to.equal(CLIENT_REV);
    });
  });

  it('rejects a relaying user without the relay permission', async () => {
    const requestOptions = await bundleRequest([allowedDoc], {
      envelope: { bundle_seq: 3 },
      auth: { username: 'bundlechw', password },
    });

    const error = await utils.request(requestOptions).catch(err => err);
    expect(error.status).to.equal(403);
  });

  it('rejects a bundle produced by a user who may not send bundles', async () => {
    const requestOptions = await bundleRequest([allowedDoc], {
      envelope: { user: 'bundletaxi', bundle_seq: 4 },
      device: taxiDevice,
    });

    // the taxi's device IS registered, so signature and decryption both succeed and the permission
    // check is the only thing left that can refuse this bundle
    const error = await utils.request(requestOptions).catch(err => err);
    expect(error.status).to.equal(400);
  });
});
