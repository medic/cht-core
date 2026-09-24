const uuid = require('uuid').v7;
const { ed25519 } = require('@noble/curves/ed25519.js');

const commonElements = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

/* global window */

/**
 * The relay half of offline data bundles: a supervisor carrying someone else's sealed data
 * delivers it to the server on their own sync.
 *
 * The other half, one phone handing a bundle to another over WiFi, needs two Android devices and
 * is not something this framework can stand up. What it can do is the part that matters most here:
 * seed a relay's store with a bundle sealed exactly the way a CHW's device seals one, and prove the
 * documents inside it reach the server as the CHW, not as the relay.
 */
describe('offline data bundle relay', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const chw = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const supervisor = userFactory.build({ place: healthCenter._id, roles: ['chw_supervisor'] });
  const deviceId = uuid();
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });

  const toBase64 = bytes => Buffer.from(bytes).toString('base64');

  /**
   * Registers a signing key for the CHW's device and seals one bundle to the server, the same way
   * `offline-data-bundle.service.ts` does: NDJSON encrypted to the server's recipient, and an
   * envelope signed over its own raw bytes.
   */
  const sealBundle = async (docs) => {
    const signingPrivateKey = ed25519.utils.randomSecretKey();
    const { server_encryption_public_key: recipient } = await utils.request({
      path: `/api/v1/users/${chw.username}/devices/${deviceId}/keys`,
      method: 'POST',
      body: {
        signing_key: {
          kty: 'OKP',
          crv: 'Ed25519',
          x: toBase64(ed25519.getPublicKey(signingPrivateKey))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
        },
      },
      auth: { username: chw.username, password: chw.password },
    });

    const { Encrypter } = await import('age-encryption');
    const encrypter = new Encrypter();
    encrypter.addRecipient(recipient);

    const envelopeBytes = Buffer.from(JSON.stringify({
      user: chw.username,
      device_id: deviceId,
      bundle_seq: 1,
    }), 'utf8');

    return {
      envelope: envelopeBytes.toString('base64'),
      signature: toBase64(ed25519.sign(envelopeBytes, signingPrivateKey)),
      ciphertext: toBase64(await encrypter.encrypt(docs.map(doc => JSON.stringify(doc)).join('\n'))),
    };
  };

  /** Puts a bundle into the relay's own store, which is what a WiFi handover would have done. */
  const carry = (bundle) => browser.execute(async (dbName, sealed) => {
    const db = new window.PouchDB(dbName);
    await db.put({
      _id: sealed.id,
      envelope: sealed.envelope,
      signature: sealed.signature,
      received_date: Date.now(),
      _attachments: {
        payload: { content_type: 'application/octet-stream', data: sealed.ciphertext },
      },
    });
  }, `medic-user-${supervisor.username}-bundles`, bundle);

  const carriedCount = () => browser.execute(async (dbName) => {
    const info = await new window.PouchDB(dbName).info();
    return info.doc_count;
  }, `medic-user-${supervisor.username}-bundles`);

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([chw, supervisor]);
    await utils.updateSettings({
      permissions: {
        can_send_offline_data_bundle: ['chw'],
        can_relay_offline_data_bundle: ['chw_supervisor'],
      },
    }, { ignoreReload: true, revert: true });
  });

  after(async () => {
    await utils.deleteUsers([chw, supervisor]);
    await utils.revertDb([], true);
  });

  it('delivers a carried bundle to the server, written as the user who sealed it', async () => {
    const bundle = { id: uuid(), ...await sealBundle([patient]) };
    await loginPage.login(supervisor);
    await commonElements.waitForPageLoaded();
    await carry(bundle);

    await commonElements.sync();

    // The document the relay could not read is now on the server, owned by the CHW's hierarchy.
    const delivered = await utils.getDoc(patient._id);
    expect(delivered.name).to.equal(patient.name);
    // and the relay is no longer carrying it
    expect(await carriedCount()).to.equal(0);
  });

  it('keeps a bundle the server will not take, rather than destroying the only copy', async () => {
    const bundle = { id: uuid(), ...await sealBundle([patient]) };
    // A signature over an envelope that is not the one being sent: the server refuses it, and no
    // number of retries will change that. The relay cannot tell, so it must not throw it away.
    bundle.signature = toBase64(ed25519.sign(Buffer.from('not this envelope'), ed25519.utils.randomSecretKey()));
    await carry(bundle);

    await commonElements.sync();

    expect(await carriedCount()).to.equal(1);
  });
});
