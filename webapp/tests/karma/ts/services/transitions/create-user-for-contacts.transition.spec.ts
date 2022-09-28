import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { DbService } from '@mm-services/db.service';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { CreateUserForContactsTransition } from '@mm-services/transitions/create-user-for-contacts.transition';
import sinon from 'sinon';
import { expect } from 'chai';

const ORIGINAL_CONTACT = {
  _id: 'original-contact',
  parent: {
    _id: 'parent-contact'
  },
};

const NEW_CONTACT = {
  _id: 'new-contact',
  parent: {
    _id: 'parent-contact'
  },
  contact: {
    _id: 'some-other-user'
  }
};

const REPLACE_USER_DOC = {
  type: 'data_record',
  form: 'replace_user',
  fields: {
    original_contact_uuid: ORIGINAL_CONTACT._id,
    new_contact_uuid: NEW_CONTACT._id,
  }
};

const getDataRecord = (contact = { _id: ORIGINAL_CONTACT._id}) => ({
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

    it('does nothing when the user is not associated with a contact', async () => {
      createUserForContactsService.getUserContact.resolves(null);

      const docs = await transition.run([REPLACE_USER_DOC]);

      expect(docs).to.deep.equal([REPLACE_USER_DOC]);
      expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
      expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      expect(createUserForContactsService.isReplaced.callCount).to.equal(0);
    });

    it('does nothing when the user is not being replaced or is not already replaced', async () => {
      createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
      createUserForContactsService.isReplaced.resolves(false);
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
      // Function from the re-parent reports flow should not be called
      afterEach(() => expect(createUserForContactsService.isReplaced.callCount).to.equal(0));

      it('sets the contact as replaced when the new contact is existing', async () => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        medicDb.get.resolves(NEW_CONTACT);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, ORIGINAL_CONTACT]);
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT, NEW_CONTACT]);
      });

      it('sets the contact as replaced when the new contact is also being submitted', async () => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);

        const docs = await transition.run([NEW_CONTACT, REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([NEW_CONTACT, REPLACE_USER_DOC, ORIGINAL_CONTACT]);
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT, NEW_CONTACT]);
      });

      it(`throws an error if the original contact being replaced does not match the user's contact`, async () => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        const replaceUserDoc = Object.assign(
          {},
          REPLACE_USER_DOC,
          { fields: { original_contact_uuid: 'different_contact' } }
        );

        try {
          await transition.run([replaceUserDoc]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to
            .equal('The only the contact associated with the currently logged in user can be replaced.');
        }

        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      });

      it(`throws an error if the new contact cannot be found`, async () => {
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
      });

      it(`throws an error if an error is encountered getting the new contact`, async () => {
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
      });
    });

    describe(`when the reports submitted do not include a replace user report, but the user is replaced`, () => {
      afterEach(() => {
        // Functions from the user replace flow should not be called
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      });

      it('re-parents the given reports to the new contact', async () => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isReplaced.resolves(true);
        createUserForContactsService.getReplacedBy.resolves(NEW_CONTACT._id);
        const submittedDocs: any = [
          getDataRecord(),
          getDataRecord({ _id: undefined }),
          getDataRecord({ _id: 'different_contact' }),
          getDataRecord(),
          NEW_CONTACT
        ];

        const docs = await transition.run(submittedDocs);

        submittedDocs[0].contact._id = NEW_CONTACT._id;
        submittedDocs[3].contact._id = NEW_CONTACT._id;
        expect(docs).to.deep.equal(submittedDocs);
        expect(createUserForContactsService.getUserContact.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });

      it('does nothing if there is no replaced by id', async () => {
        createUserForContactsService.getUserContact.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isReplaced.resolves(true);
        createUserForContactsService.getReplacedBy.resolves(null);
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
