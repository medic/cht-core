const uuid = require('uuid').v7;
const { ed25519 } = require('@noble/curves/ed25519.js');

const commonElements = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');

/* global window */

describe('offline data bundle relay', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const chw = userFactory.build({
    username: 'offlineuser-bundle-chw',
    place: healthCenter._id,
    roles: ['chw'],
    contact: { _id: 'fixture:user:bundle-chw', name: 'BundleChw' },
  });
  const supervisor = userFactory.build({
    username: 'offlineuser-bundle-relay',
    place: healthCenter._id,
    roles: ['chw_supervisor'],
    contact: { _id: 'fixture:user:bundle-relay', name: 'BundleRelay' },
  });
  const deviceId = uuid();
  const patient = {
    ...personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } }),
    _rev: '1-00000000000000000000000000000001',
  };

  const toBase64 = bytes => Buffer.from(bytes).toString('base64');

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
    const response = await new window.PouchDB(dbName).allDocs();
    return response.rows.length;
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

    const delivered = await utils.getDoc(patient._id);
    expect(delivered.name).to.equal(patient.name);
    expect(await carriedCount()).to.equal(0);
  });

  it('keeps a bundle the server will not take, rather than destroying the only copy', async () => {
    const bundle = { id: uuid(), ...await sealBundle([patient]) };
    bundle.signature = toBase64(ed25519.sign(Buffer.from('not this envelope'), ed25519.utils.randomSecretKey()));
    await carry(bundle);

    await commonElements.sync();

    expect(await carriedCount()).to.equal(1);
  });
});
