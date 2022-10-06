import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { DbService } from '@mm-services/db.service';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { CreateUserForContactsTransition } from '@mm-services/transitions/create-user-for-contacts.transition';
import sinon from 'sinon';
import { expect } from 'chai';

const PARENT_PLACE = {
  _id: 'parent-place',
  parent: {
    _id: 'grandparent-place',
  },
  contact: {
    _id: 'original-contact',
  }
};

const ORIGINAL_CONTACT = {
  _id: 'original-contact',
  parent: {
    _id: PARENT_PLACE._id,
    parent: {
      _id: PARENT_PLACE.parent._id,
    },
  },
};

const NEW_CONTACT = {
  _id: 'new-contact',
  parent: {
    _id: PARENT_PLACE._id,
    parent: {
      _id: PARENT_PLACE.parent._id,
    },
  },
};

const REPLACE_USER_DOC = {
  type: 'data_record',
  form: 'replace_user',
  fields: {
    replacement_contact_id: NEW_CONTACT._id,
  },
  contact: {
    _id: ORIGINAL_CONTACT._id,
  }
};

const getDataRecord = (contact = { _id: ORIGINAL_CONTACT._id }) => ({
  type: 'data_record',
  form: 'other',
  contact
});

describe('Create User for Contacts Transition', () => {
  let medicDb;
  let dbService;
  let createUserForContactsService;
  let transition;

  beforeEach(() => {
    medicDb = { get: sinon.stub() };
    dbService = { get: sinon.stub().returns(medicDb) };
    createUserForContactsService = {
      getUserContact: sinon.stub(),
      isReplaced: sinon.stub(),
      setReplaced: sinon.stub(),
      getReplacedBy: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: dbService },
        { provide: CreateUserForContactsService, useValue: createUserForContactsService },
      ]
    });

    transition = TestBed.inject(CreateUserForContactsTransition);
  });

  afterEach(() => sinon.restore());

  describe('init', () => {
    let consoleWarn;

    beforeEach(() => {
      consoleWarn = sinon.stub(console, 'warn');
    });

    it('returns true when replace forms have been configured', () => {
      const settings = { create_user_for_contacts: { replace_forms: ['replace_user'] } };
      expect(transition.init(settings)).to.be.true;
      expect(consoleWarn.callCount).to.equal(0);
    });

    [
      {},
      undefined,
      { replace_forms: [] },
      { replace_forms: {} },
    ].forEach((create_user_for_contacts) => {
      it(`returns false when create user for contacts config is [${JSON.stringify(create_user_for_contacts)}]`, () => {
        expect(transition.init({ create_user_for_contacts })).to.be.false;
        expect(consoleWarn.callCount).to.equal(1);
        expect(consoleWarn.args[0][0]).to.equal(
          `Configuration error. Config must define have a 'create_user_for_contacts.replace_forms' array defined.`
        );
      });
    });
  });

  describe('filter', () => {
    it('returns true when given a report', () => {
      expect(transition.filter([{ type: 'data_record' }])).to.satisfy(keep => keep);
    });

    it('returns false when no documents are provided', () => {
      expect(transition.filter([])).to.be.satisfy(keep => !keep);
    });

    it('returns false when given documents that are not data records', () => {
      const docs = [
        { type: 'person' },
        { type: 'user-settings' },
        { type: 'something_else' },
      ];

      expect(transition.filter(docs)).to.be.satisfy(keep => !keep);
    });
  });

  describe('run', () => {
    beforeEach(() => transition.init({ create_user_for_contacts: { replace_forms: ['replace_user'] } }));

    it('does nothing when the user is not associated with a contact', async() => {
      createUserForContactsService.getUserContact.resolves(null);

      const docs = await transition.run([REPLACE_USER_DOC]);

      expect(docs).to.deep.equal([REPLACE_USER_DOC]);
      expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
      expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      expect(createUserForContactsService.isReplaced.callCount).to.equal(0);
    });

    it('does nothing when the user is not being replaced or is not already replaced', async() => {
      createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
      createUserForContactsService.isReplaced.returns(false);
      const submittedDocs = [getDataRecord(), getDataRecord(), NEW_CONTACT];

      const docs = await transition.run(submittedDocs);

      expect(docs).to.deep.equal(submittedDocs);
      expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
      expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      expect(createUserForContactsService.isReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
    });

    describe(`when the reports submitted include a replace user report`, () => {
      it('sets the contact as replaced when the new contact is existing', async() => {
        const originalUser = Object.assign({}, ORIGINAL_CONTACT);
        createUserForContactsService.getUserContact.resolves(originalUser);
        medicDb.get.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
        const parentPlace = Object.assign({}, PARENT_PLACE);
        medicDb.get.withArgs(PARENT_PLACE._id).resolves(parentPlace);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser, parentPlace]);
        expect(parentPlace.contact).to.deep.equal({
          _id: NEW_CONTACT._id,
          parent: NEW_CONTACT.parent,
        });
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(2);
        expect(medicDb.get.callCount).to.equal(2);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(medicDb.get.args[1]).to.deep.equal([parentPlace._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      it('sets the contact as replaced when the new contact is also being submitted', async() => {
        const originalUser = Object.assign({}, ORIGINAL_CONTACT);
        createUserForContactsService.getUserContact.resolves(originalUser);
        const parentPlace = Object.assign({}, PARENT_PLACE);
        medicDb.get.withArgs(PARENT_PLACE._id).resolves(parentPlace);

        const docs = await transition.run([NEW_CONTACT, REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([NEW_CONTACT, REPLACE_USER_DOC, originalUser, parentPlace]);
        expect(parentPlace.contact).to.deep.equal({
          _id: NEW_CONTACT._id,
          parent: NEW_CONTACT.parent,
        });
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([parentPlace._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      it('re-parents new reports to existing user before replacing user again for existing replaced user', async() => {
        const originalUser = Object.assign({}, ORIGINAL_CONTACT);
        createUserForContactsService.getUserContact.resolves(originalUser);
        const replaceContact = Object.assign({}, REPLACE_USER_DOC.contact);
        const replaceUserDoc = Object.assign({}, REPLACE_USER_DOC, { contact: replaceContact });
        const parentPlace = Object.assign({}, PARENT_PLACE);
        medicDb.get.withArgs(PARENT_PLACE._id).resolves(parentPlace);

        const docs0 = await transition.run([NEW_CONTACT, replaceUserDoc]);

        expect(docs0).to.deep.equal([NEW_CONTACT, replaceUserDoc, originalUser, parentPlace]);
        sinon.resetHistory();

        const secondNewContact = Object.assign({}, NEW_CONTACT, { _id: 'new-contact-2' });
        const fields = Object.assign({}, replaceUserDoc.fields, { replacement_contact_id: secondNewContact._id });
        const secondReplaceUserDoc = Object.assign({}, replaceUserDoc, { fields });
        const anotherDoc = getDataRecord();
        createUserForContactsService.isReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(NEW_CONTACT._id);

        const docs1 = await transition.run([secondNewContact, secondReplaceUserDoc, anotherDoc]);

        expect(docs1).to.deep.equal([secondNewContact, secondReplaceUserDoc, anotherDoc, originalUser, parentPlace]);
        expect(parentPlace.contact).to.deep.equal({
          _id: secondNewContact._id,
          parent: secondNewContact.parent,
        });
        // Reports re-parented to first new user
        [secondReplaceUserDoc, anotherDoc].forEach(doc => expect(doc.contact._id).to.equal(NEW_CONTACT._id));
        expect(createUserForContactsService.isReplaced.callCount).to.equal(2);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(2);
        expect(createUserForContactsService.getReplacedBy.args).to.deep.equal([[originalUser], [originalUser]]);
        // User replaced again
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([parentPlace._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, secondNewContact]);
      });

      it('does not assign new contact as primary contact when original contact was not primary', async() => {
        const originalUser = Object.assign({}, ORIGINAL_CONTACT);
        createUserForContactsService.getUserContact.resolves(originalUser);
        medicDb.get.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
        const parentPlace = Object.assign({}, PARENT_PLACE, { contact: { _id: 'different-contact', } });
        medicDb.get.withArgs(PARENT_PLACE._id).resolves(parentPlace);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser]);
        expect(parentPlace.contact).to.deep.equal({ _id: 'different-contact', });
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(2);
        expect(medicDb.get.callCount).to.equal(2);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(medicDb.get.args[1]).to.deep.equal([parentPlace._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      it('does not assign new contact as primary contact when parent doc not found', async() => {
        const originalUser = Object.assign({}, ORIGINAL_CONTACT);
        createUserForContactsService.getUserContact.resolves(originalUser);
        medicDb.get.withArgs(NEW_CONTACT._id).resolves(NEW_CONTACT);
        medicDb.get.withArgs(PARENT_PLACE._id).rejects({ status: 404 });

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser]);
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(2);
        expect(medicDb.get.callCount).to.equal(2);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(medicDb.get.args[1]).to.deep.equal([PARENT_PLACE._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      [
        undefined,
        {}
      ].forEach(parent => {
        it('does not assign new contact as primary contact when contact has no parent', async() => {
          const originalUser = Object.assign({}, ORIGINAL_CONTACT);
          createUserForContactsService.getUserContact.resolves(originalUser);
          const newContact = Object.assign({}, NEW_CONTACT, { parent });
          medicDb.get.withArgs(newContact._id).resolves(newContact);

          const docs = await transition.run([REPLACE_USER_DOC]);

          expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser]);
          expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
          expect(dbService.get.callCount).to.equal(1);
          expect(medicDb.get.callCount).to.equal(1);
          expect(medicDb.get.args[0]).to.deep.equal([newContact._id]);
          expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
          expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, newContact]);
          expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
        });
      });

      it(`throws an error if the original contact being replaced does not match the user's contact`, async() => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        const replaceUserDoc = Object.assign(
          {},
          REPLACE_USER_DOC,
          { contact: { _id: 'different_contact', } }
        );

        try {
          await transition.run([replaceUserDoc]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to
            .equal('Only the contact associated with the currently logged in user can be replaced.');
        }

        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(2);
      });

      it(`throws an error when no replacement_contact_id is set`, async() => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        const replaceUserDoc = Object.assign({}, REPLACE_USER_DOC, { fields: { } });

        try {
          await transition.run([replaceUserDoc]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal('The form for replacing a user must include a replacement_contact_id field ' +
              'containing the id of the new contact.');
        }

        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      it(`throws an error if the new contact cannot be found`, async() => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        medicDb.get.rejects({ status: 404 });

        try {
          await transition.run([REPLACE_USER_DOC]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to
            .equal(`The new contact could not be found [${NEW_CONTACT._id}].`);
        }

        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      it(`throws an error if an error is encountered getting the new contact`, async() => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        medicDb.get.rejects({ message: 'Server Error' });

        try {
          await transition.run([REPLACE_USER_DOC]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal(`Server Error`);
        }

        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });

      it('throws an error if multiple replace user reports are submitted', async() => {
        const originalUser = Object.assign({}, ORIGINAL_CONTACT);
        createUserForContactsService.getUserContact.resolves(originalUser);
        const parentPlace = Object.assign({}, PARENT_PLACE);
        medicDb.get.withArgs(PARENT_PLACE._id).resolves(parentPlace);

        try {
          await transition.run([REPLACE_USER_DOC, NEW_CONTACT, REPLACE_USER_DOC]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal(`Only one user replace form is allowed to be submitted per transaction.`);
        }

        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isReplaced.callCount).to.equal(1);
      });
    });

    describe(`when the reports submitted do not include a replace user report, but the user is replaced`, () => {
      afterEach(() => {
        // Functions from the user replace flow should not be called
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      });

      it('re-parents the given reports to the new contact', async() => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(NEW_CONTACT._id);
        const submittedDocs: any = [
          getDataRecord(),
          getDataRecord({ _id: undefined }),
          getDataRecord({ _id: 'different_contact' }),
          getDataRecord(),
          NEW_CONTACT
        ];

        const docs = await transition.run(submittedDocs);
        expect(docs).to.deep.equal(submittedDocs);
        // Reports re-parented to original user
        [submittedDocs[0], submittedDocs[3]].forEach(doc => expect(doc.contact._id).to.equal(NEW_CONTACT._id));
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });

      it('does nothing if there is no replaced by id', async() => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(null);
        const submittedDocs: any = [getDataRecord()];

        const docs = await transition.run(submittedDocs);

        expect(docs).to.deep.equal(submittedDocs);
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });
    });
  });
});
