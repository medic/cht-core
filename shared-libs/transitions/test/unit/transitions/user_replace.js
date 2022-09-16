const sinon = require('sinon');
const { expect } = require('chai');
const rpn = require('request-promise-native');
const config = require('../../../src/config');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const transition = require('../../../src/transitions/user_replace');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);

const originalApiUrl = environment.apiUrl;
const originalConfigGet = config.get;

const ORIGINAL_CONTACT = {
  _id: 'original-contact-id',
  parent: {
    _id: 'parent-id',
  }
};

const NEW_CONTACT = {
  _id: 'new-contact-id',
  parent: {
    _id: 'parent-id',
  },
  phone: '+1234567890',
  name: 'New Contact',
};

const ORIGINAL_USER = {
  _id: 'original-user-id',
  contact: ORIGINAL_CONTACT,
  roles: ['chw'],
};

const REPLACE_USER_DOC = {
  _id: 'replace_user_id',
  form: 'replace_user',
  reported_date: '1',
  fields: {
    original_contact_uuid: ORIGINAL_CONTACT._id,
    new_contact_uuid: NEW_CONTACT._id,
  },
};

describe('user_replace', () => {
  before(() => environment.apiUrl = 'https://my.cht.instance');
  beforeEach(() => {
    const getOrCreatePerson = sinon.stub(people, 'getOrCreatePerson');
    getOrCreatePerson.withArgs(ORIGINAL_CONTACT._id).resolves(ORIGINAL_CONTACT);
    getOrCreatePerson.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
    sinon.stub(users, 'getList').resolves([ORIGINAL_USER]);
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
    sinon.stub(users, 'createUser').resolves();
    sinon.stub(users, 'updateUser').resolves();
  });
  afterEach(() => sinon.restore());
  after(() => {
    environment.apiUrl = originalApiUrl;
    config.get = originalConfigGet;
  });

  it('init succeeds if token_login is enabled', () => {
    config.get = sinon.stub().returns({ enabled: true });

    expect(() => transition.init()).to.not.throw();
    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['token_login']);
  });

  it('init fails if token_login is not enabled', () => {
    config.get = sinon.stub().returns({ enabled: false });

    expect(() => transition.init()).to
      .throw('Configuration error. Token login must be enabled to use the user_replace transition.');
    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['token_login']);
  });

  it('init fails if token_login config does not exist', () => {
    config.get = sinon.stub().returns(undefined);

    expect(() => transition.init()).to
      .throw('Configuration error. Token login must be enabled to use the user_replace transition.');
    expect(config.get.callCount).to.equal(1);
    expect(config.get.args[0]).to.deep.equal(['token_login']);
  });

  it('filter includes replace_user form doc', () => {
    expect(transition.filter(REPLACE_USER_DOC)).to.be.true;
  });

  it('filter excludes docs which are not from the replace_user form', () => {
    const doc = { form: 'death_report' };

    expect(transition.filter(doc)).to.be.false;
  });

  it('filter excludes docs for which the transition has already run', () => {
    const info = { transitions: { user_replace: true } };

    expect(transition.filter(REPLACE_USER_DOC, info)).to.be.false;
  });
});
