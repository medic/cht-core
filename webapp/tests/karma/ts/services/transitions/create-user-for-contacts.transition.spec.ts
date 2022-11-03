import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { DbService } from '@mm-services/db.service';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { CreateUserForContactsTransition } from '@mm-services/transitions/create-user-for-contacts.transition';
import sinon from 'sinon';
import { assert } from 'chai';
import { UserContactService } from '@mm-services/user-contact.service';

const deepFreeze = obj => {
  Object
    .keys(obj)
    .filter(prop => typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop]))
    .forEach(prop => deepFreeze(obj[prop]));
  return Object.freeze(obj);
};

const PARENT_PLACE = deepFreeze({
  _id: 'parent-place',
  parent: {
    _id: 'grandparent-place',
  },
  contact: {
    _id: 'original-contact',
  }
});

const ORIGINAL_CONTACT = deepFreeze({
  _id: 'original-contact',
  parent: {
    _id: PARENT_PLACE._id,
    parent: {
      _id: PARENT_PLACE.parent._id,
    },
  },
});

const NEW_CONTACT = deepFreeze({
  _id: 'new-contact',
  parent: {
    _id: PARENT_PLACE._id,
    parent: {
      _id: PARENT_PLACE.parent._id,
    },
  },
});

const REPLACE_USER_DOC = deepFreeze({
  type: 'data_record',
  form: 'replace_user',
  fields: {
    replacement_contact_id: NEW_CONTACT._id,
  },
  contact: {
    _id: ORIGINAL_CONTACT._id,
  }
});

const getDataRecord = (contact = { _id: ORIGINAL_CONTACT._id }) => ({
  type: 'data_record',
  form: 'other',
  contact
});

describe('Create User for Contacts Transition', () => {
  let medicDb;
  let dbService;
  let createUserForContactsService;
  let userContactService;
  let transition;

  beforeEach(() => {
    medicDb = { get: sinon.stub() };
    dbService = {
      get: sinon
        .stub()
        .returns(medicDb)
    };
    createUserForContactsService = {
      isReplaced: sinon.stub(),
      setReplaced: sinon.stub(),
      getReplacedBy: sinon.stub(),
    };
    userContactService = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: dbService },
        { provide: CreateUserForContactsService, useValue: createUserForContactsService },
        { provide: UserContactService, useValue: userContactService },
      ]
    });

    transition = TestBed.inject(CreateUserForContactsTransition);
  });

  describe('init', () => {
    let consoleWarn;

    beforeEach(() => {
      consoleWarn = sinon.stub(console, 'warn');
    });

    afterEach(() => sinon.restore());

    it('returns true when replace forms have been configured', () => {
      const settings = { create_user_for_contacts: { replace_forms: ['replace_user'] } };
      assert.isTrue(transition.init(settings));
      assert.equal(consoleWarn.callCount, 0);
    });

    [
      {},
      undefined,
      { replace_forms: [] },
      { replace_forms: {} },
    ].forEach((create_user_for_contacts) => {
      it(`returns false when create user for contacts config is [${JSON.stringify(create_user_for_contacts)}]`, () => {
        assert.isFalse(transition.init({ create_user_for_contacts }));
        assert.equal(consoleWarn.callCount, 1);
        assert.equal(
          consoleWarn.args[0][0],
          `Configuration error. Config must define have a 'create_user_for_contacts.replace_forms' array defined.`
        );
      });
    });

    it('returns false when no config is provided', () => {
      assert.isFalse(transition.init());
    });
  });

  describe('filter', () => {
    [
      [{ type: 'data_record' }],
      [{ type: 'person' }, { type: 'user-settings' }, { type: 'data_record' }],
    ].forEach(docs => {
      it('returns true when given a report', () => {
        assert.isTrue(transition.filter(docs));
      });
    });

    it('returns false when no documents array is provided', () => {
      assert.isFalse(transition.filter());
    });

    it('returns false when no documents are provided', () => {
      assert.isFalse(transition.filter([]));
    });

    it('returns false when given documents that are not data records', () => {
      const docs = [
        { type: 'person' },
        { type: 'user-settings' },
        { type: 'something_else' },
      ];

      assert.isFalse(transition.filter(docs));
    });
  });

  describe('run', () => {
    beforeEach(() => transition.init({ create_user_for_contacts: { replace_forms: ['replace_user'] } }));

    it('does nothing when the array of documents is not provided', async () => {
      const docs = await transition.run();

      assert.isEmpty(docs);
      assert.equal(userContactService.get.callCount, 0);
      assert.equal(dbService.get.callCount, 0);
      assert.equal(medicDb.get.callCount, 0);
      assert.equal(createUserForContactsService.setReplaced.callCount, 0);
      assert.equal(createUserForContactsService.isReplaced.callCount, 0);
    });

    it('does nothing when the user is not associated with a contact', async () => {
      userContactService.get.resolves(null);

      const docs = await transition.run([REPLACE_USER_DOC]);

      assert.deepEqual(docs, [REPLACE_USER_DOC]);
      assert.equal(userContactService.get.callCount, 1);
      assert.equal(dbService.get.callCount, 0);
      assert.equal(medicDb.get.callCount, 0);
      assert.equal(createUserForContactsService.setReplaced.callCount, 0);
      assert.equal(createUserForContactsService.isReplaced.callCount, 0);
    });

    it('does nothing when the user is not being replaced and is not already replaced', async () => {
      userContactService.get.resolves(ORIGINAL_CONTACT);
      createUserForContactsService.isReplaced.returns(false);
      const submittedDocs = [getDataRecord(), null, getDataRecord(), NEW_CONTACT, undefined];
      submittedDocs.forEach(doc => doc && deepFreeze(doc));

      const docs = await transition.run(submittedDocs);

      assert.deepEqual(docs, [submittedDocs[0], submittedDocs[2], submittedDocs[3]]);
      assert.equal(userContactService.get.callCount, 1);
      assert.equal(dbService.get.callCount, 0);
      assert.equal(medicDb.get.callCount, 0);
      assert.equal(createUserForContactsService.setReplaced.callCount, 0);
      assert.equal(createUserForContactsService.isReplaced.callCount, 1);
      assert.deepEqual(createUserForContactsService.isReplaced.args[0], [ORIGINAL_CONTACT]);
    });

    describe(`when the reports submitted include a replace user report`, () => {
      it('sets the contact as replaced when the new contact is existing', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        medicDb.get
          .withArgs(NEW_CONTACT._id)
          .resolves(NEW_CONTACT);
        const parentPlace = { ...PARENT_PLACE };
        medicDb.get
          .withArgs(PARENT_PLACE._id)
          .resolves(parentPlace);

        const docs = await transition.run([REPLACE_USER_DOC]);

        assert.deepEqual(docs, [REPLACE_USER_DOC, originalUser, parentPlace]);
        assert.deepEqual(parentPlace.contact, {
          _id: NEW_CONTACT._id,
          parent: NEW_CONTACT.parent,
        });
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 2);
        assert.equal(medicDb.get.callCount, 2);
        assert.deepEqual(medicDb.get.args[0], [NEW_CONTACT._id]);
        assert.deepEqual(medicDb.get.args[1], [parentPlace._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 1);
        assert.deepEqual(createUserForContactsService.setReplaced.args[0], [originalUser, NEW_CONTACT]);
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
      });

      it('sets the contact as replaced when the new contact is also being submitted', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        const parentPlace = { ...PARENT_PLACE };
        medicDb.get
          .withArgs(PARENT_PLACE._id)
          .resolves(parentPlace);

        const docs = await transition.run([NEW_CONTACT, REPLACE_USER_DOC]);

        assert.deepEqual(docs, [NEW_CONTACT, REPLACE_USER_DOC, originalUser, parentPlace]);
        assert.deepEqual(parentPlace.contact, {
          _id: NEW_CONTACT._id,
          parent: NEW_CONTACT.parent,
        });
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 1);
        assert.equal(medicDb.get.callCount, 1);
        assert.deepEqual(medicDb.get.args[0], [parentPlace._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 1);
        assert.deepEqual(createUserForContactsService.setReplaced.args[0], [originalUser, NEW_CONTACT]);
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
      });

      it('re-parents new reports to existing user before replacing user again for existing replaced user', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        const replaceUserDoc = { ...REPLACE_USER_DOC, contact: { ...REPLACE_USER_DOC.contact } };
        const parentPlace = { ...PARENT_PLACE };
        medicDb.get
          .withArgs(PARENT_PLACE._id)
          .resolves(parentPlace);

        const docs0 = await transition.run([NEW_CONTACT, replaceUserDoc]);

        assert.deepEqual(docs0, [NEW_CONTACT, replaceUserDoc, originalUser, parentPlace]);
        sinon.resetHistory();

        const secondNewContact = { ...NEW_CONTACT, id: 'new-contact-2' };
        const secondReplaceUserDoc = {
          ...replaceUserDoc,
          fields: {
            ...replaceUserDoc.fields,
            replacement_contact_id: secondNewContact._id
          }
        };
        const anotherDoc = getDataRecord();
        createUserForContactsService.isReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(NEW_CONTACT._id);

        const docs1 = await transition.run([secondNewContact, secondReplaceUserDoc, anotherDoc]);

        assert.deepEqual(docs1, [secondNewContact, secondReplaceUserDoc, anotherDoc, originalUser, parentPlace]);
        assert.deepEqual(parentPlace.contact, {
          _id: secondNewContact._id,
          parent: secondNewContact.parent,
        });
        // Reports re-parented to first new user
        [secondReplaceUserDoc, anotherDoc].forEach(doc => assert.equal(doc.contact._id, NEW_CONTACT._id));
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
        assert.equal(createUserForContactsService.getReplacedBy.callCount, 2);
        assert.deepEqual(createUserForContactsService.getReplacedBy.args, [[originalUser], [originalUser]]);
        // User replaced again
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 1);
        assert.equal(medicDb.get.callCount, 1);
        assert.deepEqual(medicDb.get.args[0], [parentPlace._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 1);
        assert.deepEqual(createUserForContactsService.setReplaced.args[0], [originalUser, secondNewContact]);
      });

      it('does not assign new contact as primary contact when original contact was not primary', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        medicDb.get
          .withArgs(NEW_CONTACT._id)
          .resolves(NEW_CONTACT);
        const parentPlace = { ...PARENT_PLACE, contact: { _id: 'different-contact', } };
        medicDb.get
          .withArgs(PARENT_PLACE._id)
          .resolves(parentPlace);

        const docs = await transition.run([REPLACE_USER_DOC]);

        assert.deepEqual(docs, [REPLACE_USER_DOC, originalUser]);
        assert.deepEqual(parentPlace.contact, { _id: 'different-contact', });
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 2);
        assert.equal(medicDb.get.callCount, 2);
        assert.deepEqual(medicDb.get.args[0], [NEW_CONTACT._id]);
        assert.deepEqual(medicDb.get.args[1], [parentPlace._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 1);
        assert.deepEqual(createUserForContactsService.setReplaced.args[0], [originalUser, NEW_CONTACT]);
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
      });

      it('does not assign new contact as primary contact when parent doc not found', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        medicDb.get
          .withArgs(NEW_CONTACT._id)
          .resolves(NEW_CONTACT);
        medicDb.get
          .withArgs(PARENT_PLACE._id)
          .rejects({ status: 404 });

        const docs = await transition.run([REPLACE_USER_DOC]);

        assert.deepEqual(docs, [REPLACE_USER_DOC, originalUser]);
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 2);
        assert.equal(medicDb.get.callCount, 2);
        assert.deepEqual(medicDb.get.args[0], [NEW_CONTACT._id]);
        assert.deepEqual(medicDb.get.args[1], [PARENT_PLACE._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 1);
        assert.deepEqual(createUserForContactsService.setReplaced.args[0], [originalUser, NEW_CONTACT]);
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
      });

      [
        undefined,
        {}
      ].forEach(parent => {
        it('does not assign new contact as primary contact when contact has no parent', async () => {
          const originalUser = { ...ORIGINAL_CONTACT };
          userContactService.get.resolves(originalUser);
          const newContact = { ...NEW_CONTACT, parent };
          medicDb.get
            .withArgs(newContact._id)
            .resolves(newContact);

          const docs = await transition.run([REPLACE_USER_DOC]);

          assert.deepEqual(docs, [REPLACE_USER_DOC, originalUser]);
          assert.equal(userContactService.get.callCount, 1);
          assert.equal(dbService.get.callCount, 1);
          assert.equal(medicDb.get.callCount, 1);
          assert.deepEqual(medicDb.get.args[0], [newContact._id]);
          assert.equal(createUserForContactsService.setReplaced.callCount, 1);
          assert.deepEqual(createUserForContactsService.setReplaced.args[0], [originalUser, newContact]);
          assert.equal(createUserForContactsService.isReplaced.callCount, 2);
        });
      });

      [undefined, { _id: 'different_contact', }].forEach(contact => {
        it(`throws an error if the original contact being replaced does not match the user's contact`, async () => {
          userContactService.get.resolves(ORIGINAL_CONTACT);
          const replaceUserDoc = { ...REPLACE_USER_DOC, contact };

          try {
            await transition.run([replaceUserDoc]);
            assert.fail('should have thrown an error');
          } catch (err) {
            assert.equal(err.message, 'Only the contact associated with the currently logged in user can be replaced.');
          }

          assert.equal(userContactService.get.callCount, 1);
          assert.equal(dbService.get.callCount, 0);
          assert.equal(medicDb.get.callCount, 0);
          assert.equal(createUserForContactsService.setReplaced.callCount, 0);
          assert.equal(createUserForContactsService.isReplaced.callCount, 2);
        });
      });

      [undefined, {}].forEach(fields => {
        it(`throws an error when no replacement_contact_id is set`, async () => {
          userContactService.get.resolves(ORIGINAL_CONTACT);
          const replaceUserDoc = { ...REPLACE_USER_DOC, fields };

          try {
            await transition.run([replaceUserDoc]);
            assert.fail('should have thrown an error');
          } catch (err) {
            assert.equal(err.message, 'The form for replacing a user must include a replacement_contact_id field ' +
              'containing the id of the new contact.');
          }

          assert.equal(userContactService.get.callCount, 1);
          assert.equal(dbService.get.callCount, 0);
          assert.equal(medicDb.get.callCount, 0);
          assert.equal(createUserForContactsService.setReplaced.callCount, 0);
          assert.equal(createUserForContactsService.isReplaced.callCount, 1);
        });
      });

      it(`throws an error if the new contact cannot be found`, async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        medicDb.get.rejects({ status: 404 });

        try {
          await transition.run([REPLACE_USER_DOC]);
          assert.fail('should have thrown an error');
        } catch (err) {
          assert.equal(err.message, `The new contact could not be found [${NEW_CONTACT._id}].`);
        }

        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 1);
        assert.equal(medicDb.get.callCount, 1);
        assert.deepEqual(medicDb.get.args[0], [NEW_CONTACT._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 0);
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
      });

      it(`throws an error if an error is encountered getting the new contact`, async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        medicDb.get.rejects({ message: 'Server Error' });

        try {
          await transition.run([REPLACE_USER_DOC]);
          assert.fail('should have thrown an error');
        } catch (err) {
          assert.equal(err.message, `Server Error`);
        }

        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 1);
        assert.equal(medicDb.get.callCount, 1);
        assert.deepEqual(medicDb.get.args[0], [NEW_CONTACT._id]);
        assert.equal(createUserForContactsService.setReplaced.callCount, 0);
        assert.equal(createUserForContactsService.isReplaced.callCount, 2);
      });

      it('throws an error if multiple replace user reports are submitted', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        const parentPlace = { ...PARENT_PLACE };
        medicDb.get
          .withArgs(PARENT_PLACE._id)
          .resolves(parentPlace);

        try {
          await transition.run([REPLACE_USER_DOC, NEW_CONTACT, REPLACE_USER_DOC]);
          assert.fail('should have thrown an error');
        } catch (err) {
          assert.equal(err.message, `Only one user replace form is allowed to be submitted per transaction.`);
        }

        assert.equal(userContactService.get.callCount, 1);
        assert.equal(dbService.get.callCount, 0);
        assert.equal(medicDb.get.callCount, 0);
        assert.equal(createUserForContactsService.setReplaced.callCount, 0);
        assert.equal(createUserForContactsService.isReplaced.callCount, 1);
      });
    });

    describe(`when the reports submitted do not include a replace user report, but the user is replaced`, () => {
      afterEach(() => {
        // Functions from the user replace flow should not be called
        assert.equal(dbService.get.callCount, 0);
        assert.equal(medicDb.get.callCount, 0);
        assert.equal(createUserForContactsService.setReplaced.callCount, 0);
      });

      it('re-parents the given reports to the new contact', async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(NEW_CONTACT._id);
        const submittedDocs: any = Object.freeze([
          getDataRecord(),
          undefined,
          deepFreeze(getDataRecord({ _id: undefined })),
          deepFreeze(getDataRecord({ _id: 'different_contact' })),
          getDataRecord(),
          NEW_CONTACT,
          null
        ]);
        const dataRecords = [submittedDocs[0], submittedDocs[4]];

        const docs = await transition.run(submittedDocs);
        assert.deepEqual(docs, [submittedDocs[0], ...submittedDocs.slice(2, 6)]);
        // Reports re-parented to original user
        dataRecords.forEach(doc => assert.equal(doc.contact._id, NEW_CONTACT._id));
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(createUserForContactsService.getReplacedBy.callCount, 1);
        assert.deepEqual(createUserForContactsService.getReplacedBy.args[0], [ORIGINAL_CONTACT]);
      });

      it('does nothing if there is no replaced by id', async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(null);
        const submittedDocs: any = [deepFreeze(getDataRecord())];

        const docs = await transition.run(submittedDocs);

        assert.deepEqual(docs, submittedDocs);
        assert.equal(userContactService.get.callCount, 1);
        assert.equal(createUserForContactsService.getReplacedBy.callCount, 1);
        assert.deepEqual(createUserForContactsService.getReplacedBy.args[0], [ORIGINAL_CONTACT]);
      });
    });
  });
});
