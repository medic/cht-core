const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid').v4;
const { expect } = require('chai');

const CLINIC = {
  _id: 'clinic',
  type: 'clinic',
};

const ORIGINAL_PERSON = {
  _id: 'original_person',
  type: 'person',
  name: 'Original Person',
  parent: { _id: 'clinic' },
};

const NEW_PERSON = {
  _id: 'new_person',
  type: 'person',
  name: 'New Person',
  phone: '+254712345678',
  parent: { _id: 'clinic' },
};

const ORIGINAL_USER = {
  _id: 'org.couchdb.user:original_person',
  type: 'user-settings',
  name: 'original_person',
  contact_id: 'original_person',
  phone: '+254712345678',
  roles: ['chw'],
};

const REPLACE_USER = {
  _id: uuid(),
  type: 'data_record',
  reported_date: new Date().getTime(),
  form: 'replace_user',
  fields: {
    original_contact_uuid: 'original_person',
    new_contact_uuid: 'new_person',
  },
};

const getSettings = ({
  transitions: { user_replace = true } = {},
  token_login: { enabled = true, translation_key = 'sms.token.login.help' } = {}
} = {}) => ({
  transitions: { user_replace },
  token_login: { enabled, translation_key }
});

describe('user_replace', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

  it('should replace a user', async () => {
    await utils.updateSettings(getSettings(), 'sentinel');
    await utils.saveDocs([
      CLINIC,
      ORIGINAL_PERSON,
      NEW_PERSON,
      ORIGINAL_USER,
      REPLACE_USER
    ]);
    await sentinelUtils.waitForSentinel([REPLACE_USER._id]);
    const infos = await sentinelUtils.getInfoDocs([REPLACE_USER._id]);
    expect(infos[0].transitions).to.not.be.undefined;
    expect(infos[0].transitions.user_replace).to.not.be.undefined;
    expect(infos[0].transitions.user_replace.ok).to.be.true;
  });
});
