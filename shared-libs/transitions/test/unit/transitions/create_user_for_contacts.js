const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');
const config = require('../../../src/config');
const db = require('../../../src/db');
const transition = rewire('../../../src/transitions/create_user_for_contacts');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);
const contactTypeUtils = require('@medic/contact-types-utils');

const deepFreeze = obj => {
  Object
    .keys(obj)
    .filter(prop => typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop]))
    .forEach(prop => deepFreeze(obj[prop]));
  return Object.freeze(obj);
};

const ORIGINAL_CONTACT = deepFreeze({
  _id: 'original-contact-id', parent: {
    _id: 'parent-id',
  }
});

const NEW_CONTACT = deepFreeze({
  _id: 'new-contact-id', parent: {
    _id: 'parent-id',
  }, phone: '+1234567890', name: 'New Contact',
});

const ORIGINAL_USER = deepFreeze({
  _id: 'org.couchdb.user:original-user-id', name: `original-user`, contact: ORIGINAL_CONTACT, roles: ['chw'],
});

const getReplacedContact = (
  status,
  replacement_contact_id = NEW_CONTACT._id,
) => ({
  _id: 'replaced-id',
  parent: {
    _id: 'parent-id',
  },
  user_for_contact: {
    replace: {
      [ORIGINAL_USER.name]: {
        replacement_contact_id,
        status,
      }
    }
  }
});

describe('create_user_for_contacts', () => {
  beforeEach(() => {
    config.init({
      getAll: sinon
        .stub()
        .returns({}), get: sinon.stub(),
    });
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('has the correct properties', () => {
    expect(transition.name).to.equal('create_user_for_contacts');
    expect(transition.asynchronousOnly).to.be.true;
  });

  describe('init', () => {
    it('succeeds if token_login is enabled and an app_url is set', () => {
      config.get
        .withArgs('token_login')
        .returns({ enabled: true });
      config.get
        .withArgs('app_url')
        .returns('https://my.cht.instance');

      expect(() => transition.init()).to.not.throw();
      expect(config.get.callCount).to.equal(2);
      expect(config.get.args).to.deep.equal([['token_login'], ['app_url']]);
    });

    it('fails if token_login is not enabled', () => {
      config.get.returns({ enabled: false });

      expect(() => transition.init()).to.throw(
        'Configuration error. Token login must be enabled to use the create_user_for_contacts transition.'
      );
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });

    it('fails if token_login config does not exist', () => {
      config.get.returns(undefined);

      expect(() => transition.init()).to.throw(
        'Configuration error. Token login must be enabled to use the create_user_for_contacts transition.'
      );
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });

    it('fails if app_url is not set', () => {
      config.get
        .withArgs('token_login')
        .returns({ enabled: true });
      config.get
        .withArgs('app_url')
        .returns(undefined);

      expect(() => transition.init()).to.throw(
        'Configuration error. The app_url must be defined to use the create_user_for_contacts transition.'
      );
      expect(config.get.callCount).to.equal(2);
      expect(config.get.args).to.deep.equal([['token_login'], ['app_url']]);
    });
  });

  describe(`filter`, () => {
    let getContactType;

    beforeEach(() => {
      getContactType = sinon
        .stub(contactTypeUtils, 'getContactType')
        .returns({ person: true });
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

    it('includes person contact doc with multiple replaced users when one has status of READY', () => {
      const doc = getReplacedContact('READY');
      doc.user_for_contact.replace.a_user = { status: 'COMPLETE' };
      doc.user_for_contact.replace.another_user = { status: 'PENDING' };

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
      expect(transition.filter(ORIGINAL_CONTACT)).to.be.false;
      assertGetContactType(ORIGINAL_CONTACT);
    });

    [
      { hello: 'world' },
      { replace: 'world' },
      { replace: { a_user: 'world' } },
      { replace: { a_user: { hello: 'world' } } },
    ].forEach(user_for_contact => {
      it('excludes person contacts which have user_for_contact data, but have not been replaced', () => {
        const originalContact = Object.assign({}, ORIGINAL_CONTACT, { user_for_contact });
        expect(transition.filter(originalContact)).to.be.false;
        assertGetContactType(originalContact);
      });
    });

    it('excludes replaced contacts which do not have a READY status', () => {
      const doc = getReplacedContact('PENDING');

      expect(transition.filter(doc)).to.be.false;
      assertGetContactType(doc);
    });

    it('excludes contact associated with multiple replaced users when none have a READY status', () => {
      const doc = getReplacedContact('PENDING');
      doc.user_for_contact.replace.a_user = { status: 'COMPLETE' };
      doc.user_for_contact.replace.another_user = { status: 'ERROR' };

      expect(transition.filter(doc)).to.be.false;
      assertGetContactType(doc);
    });
  });

  describe(`onMatch`, () => {
    let getOrCreatePerson;
    let getUserSettings;
    let createUser;
    let resetPassword;
    let validateNewUsername;

    beforeEach(() => {
      config.get
        .withArgs('app_url')
        .returns('https://my.cht.instance');
      getOrCreatePerson = sinon.stub(people, 'getOrCreatePerson');
      getOrCreatePerson
        .withArgs(ORIGINAL_CONTACT._id)
        .resolves(ORIGINAL_CONTACT);
      getOrCreatePerson
        .withArgs(NEW_CONTACT._id)
        .resolves(NEW_CONTACT);
      getUserSettings = sinon
        .stub(users, 'getUserSettings')
        .resolves(ORIGINAL_USER);
      createUser = sinon
        .stub(users, 'createUser')
        .resolves();
      resetPassword = sinon
        .stub(users, 'resetPassword')
        .resolves();
      validateNewUsername = sinon
        .stub(users, 'validateNewUsername')
        .resolves();
    });

    const expectInitialDataRetrieved = (users) => {
      expect(users).to.not.be.empty;
      const newContactIdArgs = users
        .filter(({ contact }) => contact)
        .map(({ contact }) => ([contact._id]));
      expect(getOrCreatePerson.args).to.deep.equal(newContactIdArgs);
      const expectedUserSettingsArgs = users.map(({ username }) => ([{ name: username }]));
      expect(getUserSettings.args).to.deep.equal(expectedUserSettingsArgs);
    };

    const expectUsersCreated = (users) => {
      expect(users).to.not.be.empty;
      expect(validateNewUsername.callCount).to.equal(users.length);
      validateNewUsername.args.forEach(([username]) => expect(username).to.match(/^new-contact-\d\d\d\d$/));

      expect(createUser.callCount).to.equal(users.length);
      users.forEach(({ contact, user }, index) => {
        const username = validateNewUsername.args[index][0];
        expect(createUser.args[index][0]).to.deep.equal({
          username,
          token_login: true,
          roles: user.roles,
          phone: contact.phone,
          place: contact.parent._id,
          contact: contact._id,
          fullname: contact.name,
        });

        expect(createUser.args[index][0].username).to.match(/^new-contact-\d\d\d\d$/);
        expect(createUser.args[index][1]).to.equal('https://my.cht.instance');
      });
    };

    const expectUserPasswordReset = (originalUsers) => {
      const expectedResetPasswordArgs = originalUsers.map(({ name }) => ([name]));
      expect(resetPassword.args).to.deep.equal(expectedResetPasswordArgs);
    };

    const stripCouchdbUserPrefix = username => username.replace('org.couchdb.user:', '');

    it('replaces user with READY status', async () => {
      const doc = getReplacedContact('READY');

      const result = await transition.onMatch({ doc });
      expect(result).to.be.true;

      expectInitialDataRetrieved([{ username: ORIGINAL_USER.name, contact: NEW_CONTACT }]);
      expectUsersCreated([{ contact: NEW_CONTACT, user: ORIGINAL_USER }]);
      expectUserPasswordReset([ORIGINAL_USER]);
      expect(doc.user_for_contact.replace[ORIGINAL_USER.name].status).to.equal('COMPLETE');
    });

    [
      [1, 4],
      [9, 4],
      [10, 5],
      [19, 5],
      [20, 6],
      [29, 6],
      [100, 14],
    ].forEach(([collisionCount, suffixLength]) => {
      it(`replaces user when ${collisionCount} username collisions occur`, async () => {
        let i = 100;
        transition.__set__('Math.random', () => i++ );

        validateNewUsername.rejects({ code: 400 });
        validateNewUsername
          .onCall(collisionCount)
          .resolves();
        const doc = getReplacedContact('READY');

        const result = await transition.onMatch({ doc });
        expect(result).to.be.true;

        expect(validateNewUsername.callCount).to.equal(collisionCount + 1);
        const attemptedUsernames = validateNewUsername.args.map(args => args[0]);
        expect(new Set(attemptedUsernames).size).to.equal(attemptedUsernames.length);

        const getExpectedSuffixLength = (collisionCount) => Math.floor(collisionCount / 10) + 4;

        attemptedUsernames.forEach((username, index) => {
          const suffixLength = getExpectedSuffixLength(index);
          const usernamePattern = `^new-contact-\\d{${suffixLength}}$`;
          expect(username).to.match(new RegExp(usernamePattern));
        });

        expect(createUser.callCount).to.equal(1);
        const username = stripCouchdbUserPrefix(attemptedUsernames.pop());
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
        expect(doc.user_for_contact.replace[ORIGINAL_USER.name].status).to.equal('COMPLETE');
      });
    });

    it('records error when more than 100 username collisions occur', async () => {
      validateNewUsername.rejects({ code: 400 });
      const doc = getReplacedContact('READY');

      try {
        await transition.onMatch({ doc });
        expect(true).to.equal('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal(`Could not generate a unique username for contact [${NEW_CONTACT.name}].`);
        expect(err.changed).to.be.true;

        expect(validateNewUsername.callCount).to.equal(101);
        expect(createUser.callCount).to.equal(0);
        expect(doc.user_for_contact.replace[ORIGINAL_USER.name].status).to.equal('ERROR');
      }
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
      it(`replaces user when new contact has name containing special characters [${name}]`, async () => {
        const newContact = Object.assign({}, NEW_CONTACT, { name });
        getOrCreatePerson
          .withArgs(newContact._id)
          .resolves(newContact);
        const doc = getReplacedContact('READY');

        const result = await transition.onMatch({ doc });
        expect(result).to.be.true;

        expect(createUser.callCount).to.equal(1);
        expect(createUser.args[0][0].username).to.match(new RegExp(`^${usernamePrefix}-\\d\\d\\d\\d$`));
      });
    });

    it('records error when replacing user when an error is thrown generating a new username', async () => {
      validateNewUsername.rejects({ status: 500, message: 'Server error' });
      const doc = getReplacedContact('READY');

      try {
        await transition.onMatch({ doc });
        expect(true).to.equal('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Server error');
        expect(err.changed).to.be.true;
      }
    });

    it('records error when replacing user without new contact id', async () => {
      const doc = getReplacedContact('READY', null);

      try {
        await transition.onMatch({ doc });
        expect(true).to.equal('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('No id was provided for the new replacement contact.');
        expect(err.changed).to.be.true;
      }
    });

    it('records error when replacing user with new contact that has no name', async () => {
      const newContact = Object.assign({}, NEW_CONTACT, { name: undefined });
      getOrCreatePerson
        .withArgs(newContact._id)
        .resolves(newContact);
      const doc = getReplacedContact('READY');

      try {
        await transition.onMatch({ doc });
        expect(true).to.equal('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal(`Replacement contact [${newContact._id}] must have a name.`);
        expect(err.changed).to.be.true;
      }
    });

    it('records error when replacing user with error on user creation', async () => {
      createUser.rejects({ message: 'Server Error' });
      const doc = getReplacedContact('READY');

      try {
        await transition.onMatch({ doc });
        expect(true).to.equal('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Server Error');
        expect(err.changed).to.be.true;
      }
    });

    it('records error when replacing user with nested error on user creation', async () => {
      createUser.rejects({ message: { message: 'Invalid phone number' } });
      const doc = getReplacedContact('READY');

      try {
        await transition.onMatch({ doc });
        expect(true).to.equal('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Error creating new user: "Invalid phone number"');
        expect(err.changed).to.be.true;
      }
    });

    describe('when the contact is associated with multiple replaced users', () => {
      it('replaces all users with READY status and ignores users with other statuses', async () => {
        const newContact1 = Object.assign({}, NEW_CONTACT, { _id: 'new-contact-1' });
        getOrCreatePerson
          .withArgs(newContact1._id)
          .resolves(newContact1);
        const originalUser1 = Object.assign({}, ORIGINAL_USER, { _id: 'original-user-1-id', name: 'original-user-1' });
        const originalUser2 = Object.assign({}, ORIGINAL_USER, { _id: 'original-user-2-id', name: 'original-user-2' });
        getUserSettings
          .withArgs({ name: ORIGINAL_USER.name })
          .resolves(ORIGINAL_USER);
        getUserSettings
          .withArgs({ name: originalUser1.name })
          .resolves(originalUser1);
        getUserSettings
          .withArgs({ name: originalUser2.name })
          .resolves(originalUser2);
        const doc = getReplacedContact('READY');
        doc.user_for_contact.replace.complete_user = { status: 'COMPLETE', replacement_contact_id: NEW_CONTACT._id };
        doc.user_for_contact.replace[originalUser1.name] = { status: 'READY', replacement_contact_id: NEW_CONTACT._id };
        doc.user_for_contact.replace.pending_user = { status: 'PENDING', replacement_contact_id: NEW_CONTACT._id };
        doc.user_for_contact.replace[originalUser2.name] = { status: 'READY', replacement_contact_id: newContact1._id };
        doc.user_for_contact.replace.error_user = { status: 'ERROR', replacement_contact_id: NEW_CONTACT._id };
        doc.user_for_contact.replace.invalid_user = {};

        const result = await transition.onMatch({ doc });
        expect(result).to.be.true;

        expectInitialDataRetrieved([
          { username: ORIGINAL_USER.name, contact: NEW_CONTACT },
          { username: originalUser1.name, contact: NEW_CONTACT },
          { username: originalUser2.name, contact: newContact1 },
        ]);

        expectUsersCreated([
          { contact: NEW_CONTACT, user: ORIGINAL_USER },
          { contact: NEW_CONTACT, user: originalUser1 },
          { contact: newContact1, user: originalUser2 }
        ]);
        expectUserPasswordReset([ORIGINAL_USER, originalUser1, originalUser2]);
        [ORIGINAL_USER.name, originalUser1.name, originalUser2.name].forEach(name => {
          expect(doc.user_for_contact.replace[name].status).to.equal('COMPLETE');
        });
      });

      it('records errors when all READY users fail to be replaced', async () => {
        const namelessContact = Object.assign({}, NEW_CONTACT, { _id: 'new-contact-1', name: '' });
        getOrCreatePerson
          .withArgs(namelessContact._id)
          .resolves(namelessContact);
        const originalUser1 = Object.assign({}, ORIGINAL_USER, { _id: 'original-user-1-id', name: 'original-user-1' });
        const originalUser2 = Object.assign({}, ORIGINAL_USER, { _id: 'original-user-2-id', name: 'original-user-2' });
        getUserSettings
          .withArgs({ name: ORIGINAL_USER.name })
          .resolves(ORIGINAL_USER);
        getUserSettings
          .withArgs({ name: originalUser1.name })
          .resolves(originalUser1);
        getUserSettings
          .withArgs({ name: originalUser2.name })
          .resolves(originalUser2);
        const doc = getReplacedContact('READY', '');
        doc.user_for_contact.replace[originalUser1.name] = { status: 'READY' };
        doc.user_for_contact.replace[originalUser2.name] = {
          status: 'READY', replacement_contact_id: namelessContact._id
        };

        try {
          await transition.onMatch({ doc });
          expect(true).to.equal('Should have thrown');
        } catch (err) {
          const expectedMessage = [
            'No id was provided for the new replacement contact.',
            'No id was provided for the new replacement contact.',
            `Replacement contact [${namelessContact._id}] must have a name.`,
          ].join(', ');
          expect(err.message).to.equal(expectedMessage);
          expect(err.changed).to.be.true;
        }

        expectInitialDataRetrieved([
          { username: ORIGINAL_USER.name, },
          { username: originalUser1.name, },
          { username: originalUser2.name, contact: namelessContact },
        ]);
        expect(validateNewUsername.callCount).to.equal(0);
        expect(createUser.callCount).to.equal(0);
        expect(resetPassword.callCount).to.equal(0);

        [ORIGINAL_USER.name, originalUser1.name, originalUser2.name].forEach(name => {
          expect(doc.user_for_contact.replace[name].status).to.equal('ERROR');
        });
      });


      it('replaces some users and records errors for other that fail to be replaced', async () => {
        const errorUser1 = Object.assign({}, ORIGINAL_USER, { _id: 'error-user-1-id', name: 'error-user-1' });
        const originalUser1 = Object.assign({}, ORIGINAL_USER, { _id: 'original-user-1-id', name: 'original-user-1' });
        const errorUser2 = Object.assign({}, ORIGINAL_USER, { _id: 'error-user-2-id', name: 'error-user-2' });
        getUserSettings
          .withArgs({ name: ORIGINAL_USER.name })
          .resolves(ORIGINAL_USER);
        getUserSettings
          .withArgs({ name: errorUser1.name })
          .resolves(errorUser1);
        getUserSettings
          .withArgs({ name: originalUser1.name })
          .resolves(originalUser1);
        getUserSettings
          .withArgs({ name: errorUser2.name })
          .resolves(errorUser2);
        const doc = getReplacedContact('READY');
        doc.user_for_contact.replace[errorUser1.name] = { status: 'READY' };
        doc.user_for_contact.replace[originalUser1.name] = { status: 'READY', replacement_contact_id: NEW_CONTACT._id };
        doc.user_for_contact.replace[errorUser2.name] = { status: 'READY' };

        try {
          await transition.onMatch({ doc });
          expect(true).to.equal('Should have thrown');
        } catch (err) {
          const expectedMessage = [
            'No id was provided for the new replacement contact.',
            'No id was provided for the new replacement contact.',
          ].join(', ');
          expect(err.message).to.equal(expectedMessage);
          expect(err.changed).to.be.true;
        }

        expectInitialDataRetrieved([
          { username: ORIGINAL_USER.name, contact: NEW_CONTACT },
          { username: errorUser1.name },
          { username: originalUser1.name, contact: NEW_CONTACT },
          { username: errorUser2.name },
        ]);
        expectUsersCreated([
          { contact: NEW_CONTACT, user: ORIGINAL_USER }, { contact: NEW_CONTACT, user: originalUser1 },
        ]);
        expectUserPasswordReset([ORIGINAL_USER, originalUser1]);

        [errorUser1.name, errorUser2.name, ].forEach(name => {
          expect(doc.user_for_contact.replace[name].status).to.equal('ERROR');
        });
        [ORIGINAL_USER.name, originalUser1.name, ].forEach(name => {
          expect(doc.user_for_contact.replace[name].status).to.equal('COMPLETE');
        });
      });
    });
  });
});
