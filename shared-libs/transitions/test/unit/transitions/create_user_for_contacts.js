const sinon = require('sinon');
const { expect } = require('chai');
const config = require('../../../src/config');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const transition = require('../../../src/transitions/create_user_for_contacts');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);
const contactTypeUtils = require('@medic/contact-types-utils');

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
  name: `original-user`,
  contact: ORIGINAL_CONTACT,
  roles: ['chw'],
};

const getReplacedContact = (status, by = NEW_CONTACT._id) => ({
  _id: 'replaced-id',
  parent: {
    _id: 'parent-id',
  },
  user_for_contact: {
    replaced: {
      by,
      status,
    }
  }
});

describe('create_user_for_contacts', () => {
  afterEach(() => sinon.restore());

  it('has the proper name', () => {
    expect(transition.name).to.equal('create_user_for_contacts');
  });

  describe('init', () => {
    it('succeeds if token_login is enabled', () => {
      sinon.stub(config, 'get').returns({ enabled: true });

      expect(() => transition.init()).to.not.throw();
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });

    it('fails if token_login is not enabled', () => {
      sinon.stub(config, 'get').returns({ enabled: false });

      expect(() => transition.init()).to
        .throw('Configuration error. Token login must be enabled to use the create_user_for_contacts transition.');
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });

    it('fails if token_login config does not exist', () => {
      sinon.stub(config, 'get').returns(undefined);

      expect(() => transition.init()).to
        .throw('Configuration error. Token login must be enabled to use the create_user_for_contacts transition.');
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });
  });

  describe(`filter`, () => {
    let getContactType;

    beforeEach(() => {
      getContactType = sinon.stub(contactTypeUtils, 'getContactType').returns({ person: true });
    });

    const assertGetContactType = (doc) => {
      expect(getContactType.callCount).to.equal(1);
      expect(getContactType.args[0]).to.deep.equal([{}, doc]);
    };

    it('includes person contact doc with a replaced status of READY', () => {
      const doc = getReplacedContact('READY');

      expect(transition.filter(doc)).to.be.true;
      assertGetContactType(doc);
    });

    it('excludes docs which do not have a contact type', () => {
      const doc = getReplacedContact('READY');
      contactTypeUtils.getContactType.returns(undefined);

      expect(transition.filter(doc)).to.be.false;
      assertGetContactType(doc);
    });

    it('excludes docs with a contact type that is not a person type', () => {
      const doc = getReplacedContact('READY');
      contactTypeUtils.getContactType.returns({ person: false });

      expect(transition.filter(doc)).to.be.false;
      assertGetContactType(doc);
    });

    it('excludes person contacts which have not been replaced', () => {
      expect(transition.filter(ORIGINAL_CONTACT)).to.be.undefined;
      assertGetContactType(ORIGINAL_CONTACT);
    });

    it('excludes replaced contacts which do not have a READY status', () => {
      const doc = getReplacedContact('PENDING');

      expect(transition.filter(doc)).to.be.false;
      assertGetContactType(doc);
    });
  });

  describe(`onMatch`, () => {
    const originalApiUrl = environment.apiUrl;

    let getOrCreatePerson;
    let getUserSettings;
    let createUser;
    let deleteUser;
    let usersGet;

    before(() => environment.apiUrl = 'https://my.cht.instance');
    beforeEach(() => {
      getOrCreatePerson = sinon.stub(people, 'getOrCreatePerson');
      getOrCreatePerson.withArgs(ORIGINAL_CONTACT._id).resolves(ORIGINAL_CONTACT);
      getOrCreatePerson.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
      getUserSettings = sinon.stub(users, 'getUserSettings').resolves(ORIGINAL_USER);
      createUser = sinon.stub(users, 'createUser').resolves();
      deleteUser = sinon.stub(users, 'deleteUser').resolves();
      usersGet = sinon.stub(db.users, 'get').rejects({ status: 404 });
    });
    after(() => environment.apiUrl = originalApiUrl);

    const expectInitialDataRetrieved = (originalContact, newContact) => {
      expect(getOrCreatePerson.withArgs(newContact._id).callCount).to.equal(1);
      expect(getUserSettings.callCount).to.equal(1);
      expect(getUserSettings.args[0]).to.deep.equal([{ contact_id: 'replaced-id' }]);
    };

    const expectUserCreated = (newContact, originalUser) => {
      expect(usersGet.callCount).to.equal(1);
      expect(usersGet.args[0][0]).to.match(/^org\.couchdb\.user:new-contact-\d\d\d\d/);
      expect(createUser.callCount).to.equal(1);
      expect(createUser.args[0][0]).to.deep.include({
        token_login: true,
        roles: originalUser.roles,
        phone: newContact.phone,
        place: newContact.parent._id,
        contact: newContact._id,
        fullname: newContact.name,
      });
      expect(createUser.args[0][0].username).to.match(/^new-contact-\d\d\d\d$/);
      expect(createUser.args[0][1]).to.equal(environment.apiUrl);
    };

    const expectUserDeleted = (originalUser) => {
      expect(deleteUser.callCount).to.equal(1);
      expect(deleteUser.args[0]).to.deep.equal([originalUser.name]);
    };

    it('replaces user with READY status', () => {
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc }).then(result => {
        expect(result).to.be.true;

        expectInitialDataRetrieved(ORIGINAL_CONTACT, NEW_CONTACT);
        expectUserCreated(NEW_CONTACT, ORIGINAL_USER);
        expectUserDeleted(ORIGINAL_USER);
        expect(doc.user_for_contact.replaced.status).to.equal('COMPLETE');
      });
    });

    it('replaces user when new username collision occurs', () => {
      usersGet.onFirstCall().resolves();
      usersGet.onSecondCall().resolves();
      usersGet.onThirdCall().rejects({ status: 404 });
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc }).then(result => {
        expect(result).to.be.true;

        expect(usersGet.callCount).to.equal(3);
        expect(usersGet.args[0][0]).to.match(/^org\.couchdb\.user:new-contact-\d\d\d\d/);
        expect(usersGet.args[1][0]).to.match(/^org\.couchdb\.user:new-contact-\d\d\d\d/);
        expect(usersGet.args[2][0]).to.match(/^org\.couchdb\.user:new-contact-\d\d\d\d/);
        expect(usersGet.args[0][0]).to.not.equal(usersGet.args[1][0]);
        expect(usersGet.args[0][0]).to.not.equal(usersGet.args[2][0]);

        expect(createUser.callCount).to.equal(1);
        expect(createUser.args[0][0]).to.deep.include({
          token_login: true,
          roles: ORIGINAL_USER.roles,
          phone: NEW_CONTACT.phone,
          place: NEW_CONTACT.parent._id,
          contact: NEW_CONTACT._id,
          fullname: NEW_CONTACT.name,
        });
        expect(createUser.args[0][0].username).to.match(/^new-contact-\d\d\d\d$/);
        expect(createUser.args[0][1]).to.equal(environment.apiUrl);
        expect(usersGet.args[2][0]).to.include(createUser.args[0][0].username);
        expect(doc.user_for_contact.replaced.status).to.equal('COMPLETE');
      });
    });

    [
      ['/strange/name-breaks', 'strangenamebreaks'],
      ['💚HEART', 'heart'],
      ['¤ us$ crypto₿ rial﷼', '-us-crypto-rial'],
      ['👾', ''],
      [' Peña Ziębówna Galván Dāwūd   ʾĀsif ', 'pena-ziebowna-galvan-dawud-asif'],
      ['بَرثُولَماوُس', ''],
    ].forEach(([name, usernamePrefix]) => {
      it(`replaces user when new contact has name containing special characters [${name}]`, () => {
        const newContact = Object.assign({}, NEW_CONTACT, { name });
        getOrCreatePerson.withArgs(newContact._id).resolves(newContact);
        const doc = getReplacedContact('READY');

        return transition.onMatch({ doc }).then(result => {
          expect(result).to.be.true;

          expect(createUser.callCount).to.equal(1);
          expect(createUser.args[0][0].username).to.match(new RegExp(`^${usernamePrefix}-\\d\\d\\d\\d$`));
        });
      });
    });

    it('records error when replacing user when an error is thrown generating a new username', () => {
      usersGet.rejects({ status: 500, message: 'Server error' });
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Server error');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user without new contact id', () => {
      const doc = getReplacedContact('READY', null);

      return transition.onMatch({ doc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('No id was provided for the new replacement contact.');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with new contact that has no name', () => {
      const newContact = Object.assign({}, NEW_CONTACT, { name: undefined });
      getOrCreatePerson.withArgs(newContact._id).resolves(newContact);
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Replacement contact [${newContact._id}] must have a name.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with error on user creation', () => {
      createUser.rejects({ message: 'Server Error' });
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Server Error');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with nested error on user creation', () => {
      createUser.rejects({ message: { message: 'Invalid phone number' } });
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Error creating new user: "Invalid phone number"');
          expect(err.changed).to.be.true;
        });
    });
  });
});
