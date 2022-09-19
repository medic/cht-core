const sinon = require('sinon');
const { expect } = require('chai');
const config = require('../../../src/config');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const search = require('../../../src/lib/search');
const transition = require('../../../src/transitions/user_replace');
const { people } = require('@medic/contacts')(config, db);
const { users } = require('@medic/user-management')(config, db);

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
  afterEach(() => sinon.restore());

  it('has the proper name', () => {
    expect(transition.name).to.equal('user_replace');
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
        .throw('Configuration error. Token login must be enabled to use the user_replace transition.');
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });

    it('fails if token_login config does not exist', () => {
      sinon.stub(config, 'get').returns(undefined);

      expect(() => transition.init()).to
        .throw('Configuration error. Token login must be enabled to use the user_replace transition.');
      expect(config.get.callCount).to.equal(1);
      expect(config.get.args[0]).to.deep.equal(['token_login']);
    });
  });

  describe(`filter`, () => {
    it('includes replace_user form doc', () => {
      expect(transition.filter(REPLACE_USER_DOC)).to.be.true;
    });

    it('excludes docs which are not from the replace_user form', () => {
      const doc = { form: 'death_report' };

      expect(transition.filter(doc)).to.be.false;
    });

    it('excludes docs for which the transition has already run', () => {
      const info = { transitions: { user_replace: true } };

      expect(transition.filter(REPLACE_USER_DOC, info)).to.be.false;
    });
  });

  describe(`onMatch`, () => {
    const originalApiUrl = environment.apiUrl;

    let getOrCreatePerson;
    let getUserSettings;
    let createUser;
    let deleteUser;
    let usersGet;
    let executeSearch;
    let medicAllDocs;
    let medicBulkDocs;

    before(() => environment.apiUrl = 'https://my.cht.instance');
    beforeEach(() => {
      getOrCreatePerson = sinon.stub(people, 'getOrCreatePerson');
      getOrCreatePerson.withArgs(ORIGINAL_CONTACT._id).resolves(ORIGINAL_CONTACT);
      getOrCreatePerson.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
      getUserSettings = sinon.stub(users, 'getUserSettings').resolves(ORIGINAL_USER);
      createUser = sinon.stub(users, 'createUser').resolves();
      deleteUser = sinon.stub(users, 'deleteUser').resolves();
      usersGet = sinon.stub(db.users, 'get').rejects({ status: 404 });
      executeSearch = sinon.stub(search, 'execute').resolves({ docIds: [] });
      medicAllDocs = sinon.stub(db.medic, 'allDocs').resolves({ rows: [] });
      medicBulkDocs = sinon.stub(db.medic, 'bulkDocs').resolves();
    });
    after(() => environment.apiUrl = originalApiUrl);

    const expectInitialDataRetrieved = (originalContact, newContact) => {
      expect(getOrCreatePerson.withArgs(originalContact._id).callCount).to.equal(1);
      expect(getOrCreatePerson.withArgs(newContact._id).callCount).to.equal(1);
      expect(getUserSettings.callCount).to.equal(1);
      expect(getUserSettings.args[0]).to.deep.equal([{ contact_id: originalContact._id }]);
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

    it('replaces user with no documents', () => {
      return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
        expect(result).to.be.true;

        expectInitialDataRetrieved(ORIGINAL_CONTACT, NEW_CONTACT);
        expectUserCreated(NEW_CONTACT, ORIGINAL_USER);
        expectUserDeleted(ORIGINAL_USER);

        // Checks for reports to re-parent
        expect(executeSearch.callCount).to.equal(1);
        expect(executeSearch.args[0]).to.deep.equal([
          'reports',
          {
            date: { from: REPLACE_USER_DOC.reported_date + 1, },
            contact: ORIGINAL_CONTACT._id,
          },
          { limit: 100, skip: 0, },
        ]);
        expect(medicAllDocs.callCount).to.equal(0);
        expect(medicBulkDocs.callCount).to.equal(0);
      });
    });

    it('replaces user with a document to re-parent', () => {
      const doc = { _id: 'doc', contact: { _id: ORIGINAL_CONTACT._id } };
      executeSearch.resolves({ docIds: [doc._id] });
      medicAllDocs.resolves({ rows: [{ doc }] });

      return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
        expect(result).to.be.true;

        expectInitialDataRetrieved(ORIGINAL_CONTACT, NEW_CONTACT);
        expectUserCreated(NEW_CONTACT, ORIGINAL_USER);
        expectUserDeleted(ORIGINAL_USER);

        // Checks for reports to re-parent
        expect(executeSearch.callCount).to.equal(1);
        expect(executeSearch.args[0]).to.deep.equal([
          'reports',
          {
            date: { from: REPLACE_USER_DOC.reported_date + 1, },
            contact: ORIGINAL_CONTACT._id,
          },
          { limit: 100, skip: 0, },
        ]);
        expect(medicAllDocs.callCount).to.equal(1);
        expect(medicAllDocs.args[0]).to.deep.equal([{ keys: [doc._id], include_docs: true }]);
        expect(medicBulkDocs.callCount).to.equal(1);
        doc.contact._id = NEW_CONTACT._id;
        expect(medicBulkDocs.args[0]).to.deep.equal([[doc]]);
      });
    });

    it('replaces user with many documents to re-parent in batches', () => {
      const docs = new Array(201).fill(null)
        .map((_, index) => ({ _id: `doc-${index}`, contact: { _id: ORIGINAL_CONTACT._id } }));
      const docIds = docs.map(doc => doc._id);
      executeSearch.onFirstCall().resolves({ docIds: docIds.slice(0, 100) });
      executeSearch.onSecondCall().resolves({ docIds: docIds.slice(100, 200) });
      executeSearch.onThirdCall().resolves({ docIds: docIds.slice(200) });
      const rows = docs.map(doc => ({ doc }));
      medicAllDocs.onFirstCall().resolves({ rows: rows.slice(0, 100) });
      medicAllDocs.onSecondCall().resolves({ rows: rows.slice(100, 200) });
      medicAllDocs.onThirdCall().resolves({ rows: rows.slice(200) });

      return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
        expect(result).to.be.true;

        expectInitialDataRetrieved(ORIGINAL_CONTACT, NEW_CONTACT);
        expectUserCreated(NEW_CONTACT, ORIGINAL_USER);
        expectUserDeleted(ORIGINAL_USER);

        // Checks for reports to re-parent
        expect(executeSearch.callCount).to.equal(3);
        expect(executeSearch.args[0]).to.deep.equal([
          'reports',
          {
            date: { from: REPLACE_USER_DOC.reported_date + 1, },
            contact: ORIGINAL_CONTACT._id,
          },
          { limit: 100, skip: 0, },
        ]);
        expect(executeSearch.args[1]).to.deep.equal([
          'reports',
          {
            date: { from: REPLACE_USER_DOC.reported_date + 1, },
            contact: ORIGINAL_CONTACT._id,
          },
          { limit: 100, skip: 100, },
        ]);
        expect(executeSearch.args[2]).to.deep.equal([
          'reports',
          {
            date: { from: REPLACE_USER_DOC.reported_date + 1, },
            contact: ORIGINAL_CONTACT._id,
          },
          { limit: 100, skip: 200, },
        ]);
        expect(medicAllDocs.callCount).to.equal(3);
        expect(medicAllDocs.args[0]).to.deep.equal([{ keys: docIds.slice(0, 100), include_docs: true }]);
        expect(medicAllDocs.args[1]).to.deep.equal([{ keys: docIds.slice(100, 200), include_docs: true }]);
        expect(medicAllDocs.args[2]).to.deep.equal([{ keys: docIds.slice(200), include_docs: true }]);

        expect(medicBulkDocs.callCount).to.equal(3);
        docs.forEach(doc => doc.contact._id = NEW_CONTACT._id);
        expect(medicBulkDocs.args[0]).to.deep.equal([docs.slice(0, 100)]);
        expect(medicBulkDocs.args[1]).to.deep.equal([docs.slice(100, 200)]);
        expect(medicBulkDocs.args[2]).to.deep.equal([docs.slice(200)]);
      });
    });

    it('replaces user with no documents when search returns some doc ids', () => {
      executeSearch.resolves({ docIds: ['mising-doc-1', 'mising-doc-2'] });

      return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
        expect(result).to.be.true;

        expectInitialDataRetrieved(ORIGINAL_CONTACT, NEW_CONTACT);
        expectUserCreated(NEW_CONTACT, ORIGINAL_USER);
        expectUserDeleted(ORIGINAL_USER);

        // Checks for reports to re-parent
        expect(executeSearch.callCount).to.equal(1);
        expect(executeSearch.args[0]).to.deep.equal([
          'reports',
          {
            date: { from: REPLACE_USER_DOC.reported_date + 1, },
            contact: ORIGINAL_CONTACT._id,
          },
          { limit: 100, skip: 0, },
        ]);
        expect(medicAllDocs.callCount).to.equal(1);
        expect(medicBulkDocs.callCount).to.equal(0);
      });
    });

    it('replaces user when new username collision occurs', () => {
      usersGet.onFirstCall().resolves();
      usersGet.onSecondCall().resolves();
      usersGet.onThirdCall().rejects({ status: 404 });

      return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
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

        return transition.onMatch({ doc: REPLACE_USER_DOC }).then(result => {
          expect(result).to.be.true;

          expect(createUser.callCount).to.equal(1);
          expect(createUser.args[0][0].username).to.match(new RegExp(`^${usernamePrefix}-\\d\\d\\d\\d$`));
        });
      });
    });

    it('records error when replacing user when an error is thrown generating a new username', () => {
      usersGet.rejects({ status: 500, message: 'Server error' });

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Server error');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user without reported date', () => {
      const replaceUserDoc = Object.assign({}, REPLACE_USER_DOC, { reported_date: undefined });

      return transition.onMatch({ doc: replaceUserDoc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('The reported_date field must be populated on the replace_user report.');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user without original contact id', () => {
      const fields = Object.assign({}, REPLACE_USER_DOC.fields, { original_contact_uuid: undefined });
      const replaceUserDoc = Object.assign({}, REPLACE_USER_DOC, { fields });

      return transition.onMatch({ doc: replaceUserDoc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('The original_contact_uuid field must be populated on the replace_user report.');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user without new contact id', () => {
      const fields = Object.assign({}, REPLACE_USER_DOC.fields, { new_contact_uuid: undefined });
      const replaceUserDoc = Object.assign({}, REPLACE_USER_DOC, { fields });

      return transition.onMatch({ doc: replaceUserDoc })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('The new_contact_uuid field must be populated on the replace_user report.');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with original contact that has no parent', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { parent: undefined });
      getOrCreatePerson.withArgs(originalContact._id).resolves(originalContact);

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Contact [${originalContact._id}] does not have a parent.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with original contact that has no parent', () => {
      const parent = Object.assign({}, ORIGINAL_CONTACT.parent, { _id: undefined });
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { parent });
      getOrCreatePerson.withArgs(originalContact._id).resolves(originalContact);

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Contact [${originalContact._id}] does not have a parent.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with new contact that has no parent', () => {
      const newContact = Object.assign({}, NEW_CONTACT, { parent: undefined });
      getOrCreatePerson.withArgs(newContact._id).resolves(newContact);

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Contact [${newContact._id}] does not have a parent.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with new contact that has no parent', () => {
      const parent = Object.assign({}, NEW_CONTACT.parent, { _id: undefined });
      const newContact = Object.assign({}, NEW_CONTACT, { parent });
      getOrCreatePerson.withArgs(newContact._id).resolves(newContact);

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Contact [${newContact._id}] does not have a parent.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with contacts that do not have the same parent', () => {
      const newContact = Object.assign({}, NEW_CONTACT, { parent: { _id: 'new-parent-id' } });
      getOrCreatePerson.withArgs(newContact._id).resolves(newContact);

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`The replacement contact must have the same parent as the original contact.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with new contact that has no name', () => {
      const newContact = Object.assign({}, NEW_CONTACT, { name: undefined });
      getOrCreatePerson.withArgs(newContact._id).resolves(newContact);

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal(`Replacement contact [${newContact._id}] must have a name.`);
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with error on user creation', () => {
      createUser.rejects({ message: 'Server Error' });

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Server Error');
          expect(err.changed).to.be.true;
        });
    });

    it('records error when replacing user with nested error on user creation', () => {
      createUser.rejects({ message: { message: 'Invalid phone number' } });

      return transition.onMatch({ doc: REPLACE_USER_DOC })
        .then(() => expect.fail('Should have thrown'))
        .catch(err => {
          expect(err.message).to.equal('Error creating new user: "Invalid phone number"');
          expect(err.changed).to.be.true;
        });
    });
  });
});
