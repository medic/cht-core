const sinon = require('sinon');
const { expect } = require('chai');
const config = require('../../../src/config');
const db = require('../../../src/db');
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

  it('has the correct properties', () => {
    expect(transition.name).to.equal('create_user_for_contacts');
    expect(transition.asynchronousOnly).to.equal(true);
  });

  describe('init', () => {
    it('succeeds if token_login is enabled and an app_url is set', () => {
      sinon.stub(config, 'get').withArgs('token_login').returns({ enabled: true });
      config.get.withArgs('app_url').returns('https://my.cht.instance');

      expect(() => transition.init()).to.not.throw();
      expect(config.get.callCount).to.equal(2);
      expect(config.get.args).to.deep.equal([['token_login'], ['app_url']]);
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

    it('fails if app_url is not set', () => {
      sinon.stub(config, 'get').withArgs('token_login').returns({ enabled: true });
      config.get.withArgs('app_url').returns(undefined);

      expect(() => transition.init()).to
        .throw('Configuration error. The app_url must be defined to use the create_user_for_contacts transition.');
      expect(config.get.callCount).to.equal(2);
      expect(config.get.args).to.deep.equal([['token_login'], ['app_url']]);
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

    it('excludes person contacts which do not have user_for_contact data', () => {
      expect(transition.filter(ORIGINAL_CONTACT)).to.be.undefined;
      assertGetContactType(ORIGINAL_CONTACT);
    });

    it('excludes person contacts which have user_for_contact data, but have not been replaced', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { user_for_contact: { hello: 'world' } });
      expect(transition.filter(originalContact)).to.be.undefined;
      assertGetContactType(originalContact);
    });

    it('excludes replaced contacts which do not have a READY status', () => {
      const doc = getReplacedContact('PENDING');

      expect(transition.filter(doc)).to.be.false;
      assertGetContactType(doc);
    });
  });

  describe(`onMatch`, () => {
    let getOrCreatePerson;
    let getUserSettings;
    let createUser;
    let deleteUser;
    let usersGet;

    beforeEach(() => {
      sinon.stub(config, 'get').withArgs('app_url').returns('https://my.cht.instance');
      getOrCreatePerson = sinon.stub(people, 'getOrCreatePerson');
      getOrCreatePerson.withArgs(ORIGINAL_CONTACT._id).resolves(ORIGINAL_CONTACT);
      getOrCreatePerson.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
      getUserSettings = sinon.stub(users, 'getUserSettings').resolves(ORIGINAL_USER);
      createUser = sinon.stub(users, 'createUser').resolves();
      deleteUser = sinon.stub(users, 'deleteUser').resolves();
      usersGet = sinon.stub(db.users, 'get').rejects({ status: 404 });
    });

    const expectInitialDataRetrieved = (originalContact, newContact) => {
      expect(getOrCreatePerson.withArgs(newContact._id).callCount).to.equal(1);
      expect(getUserSettings.callCount).to.equal(1);
      expect(getUserSettings.args[0]).to.deep.equal([{ contact_id: originalContact._id }]);
    };

    const expectUserCreated = (newContact, originalUser) => {
      expect(usersGet.callCount).to.equal(1);
      expect(usersGet.args[0][0]).to.match(/^org\.couchdb\.user:new-contact-\d\d\d\d/);
      expect(createUser.callCount).to.equal(1);
      const username = usersGet.args[0][0].substring(17);
      expect(createUser.args[0][0]).to.deep.equal({
        username,
        token_login: true,
        roles: originalUser.roles,
        phone: newContact.phone,
        place: newContact.parent._id,
        contact: newContact._id,
        fullname: newContact.name,
      });
      expect(createUser.args[0][0].username).to.match(/^new-contact-\d\d\d\d$/);
      expect(createUser.args[0][1]).to.equal('https://my.cht.instance');
    };

    const expectUserDeleted = (originalUser) => {
      expect(deleteUser.callCount).to.equal(1);
      expect(deleteUser.args[0]).to.deep.equal([originalUser.name]);
    };

    it('replaces user with READY status', () => {
      const doc = getReplacedContact('READY');

      return transition.onMatch({ doc }).then(result => {
        expect(result).to.be.true;

        expectInitialDataRetrieved(doc, NEW_CONTACT);
        expectUserCreated(NEW_CONTACT, ORIGINAL_USER);
        expectUserDeleted(ORIGINAL_USER);
        expect(doc.user_for_contact.replaced.status).to.equal('COMPLETE');
      });
    });

    const getExpectedSuffixLength = (collisionCount) => Math.floor(collisionCount / 10) + 4;

    [
      [1, 4],
      [9, 4],
      [10, 5],
      [19, 5],
      [20, 6],
      [29, 6],
      [100, 14],
    ].forEach(([collisionCount, suffixLength]) => {
      it(`replaces user when ${collisionCount} username collisions occur`, () => {
        usersGet.resolves();
        usersGet.onCall(collisionCount).rejects({ status: 404 });
        const doc = getReplacedContact('READY');

        return transition.onMatch({ doc }).then(result => {
          expect(result).to.be.true;

          expect(usersGet.callCount).to.equal(collisionCount + 1);
          const attemptedUsernames = usersGet.args.map(args => args[0]);
          expect(new Set(attemptedUsernames).size).to.equal(attemptedUsernames.length);

          attemptedUsernames.forEach((username, index) => {
            const suffixLength = getExpectedSuffixLength(index);
            const usernamePattern = `^org\\.couchdb\\.user:new-contact-\\d{${suffixLength}}$`;
            expect(username).to.match(new RegExp(usernamePattern));
          });

          expect(createUser.callCount).to.equal(1);
          const username = attemptedUsernames.pop().substring(17);
          expect(username).to.match(new RegExp(`^new-contact-\\d{${suffixLength}}$`));
          expect(createUser.args[0][0]).to.deep.equal({
            username,
            token_login: true,
            roles: ORIGINAL_USER.roles,
            phone: NEW_CONTACT.phone,
            place: NEW_CONTACT.parent._id,
            contact: NEW_CONTACT._id,
            fullname: NEW_CONTACT.name,
          });
          expect(createUser.args[0][1]).to.equal('https://my.cht.instance');
          expect(doc.user_for_contact.replaced.status).to.equal('COMPLETE');
        });
      });
    });

    it('records error when more than 100 username collisions occur', () => {
      usersGet.resolves();
      const doc = getReplacedContact('READY');

      return transition
        .onMatch({ doc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Could not generate a unique username for contact [${NEW_CONTACT.name}].`);
          expect(err.changed).to.be.true;

          expect(usersGet.callCount).to.equal(101);
          expect(createUser.callCount).to.equal(0);
          expect(doc.user_for_contact.replaced.status).to.equal('ERROR');
        });
    });

    [
      ['P. Sherman 42 Wallaby Way, Sidney', 'p-sherman-42-wallaby-way-sidney'],
      ['00101010', '00101010'],
      ['/strange/name-breaks', 'strangenamebreaks'],
      ['💚HEART', 'heart'],
      ['¤ us$ crypto₿ rial﷼', '-us-crypto-rial'],
      ['👾', ''],
      [' Peña Ziębówna Galván Dāwūd   ʾĀsif ', 'pena-ziebowna-galvan-dawud-asif'],
      ['بَرثُولَماوُس', ''],
      ['पासाङ ल्हामु शेर्पा', '-'],
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
