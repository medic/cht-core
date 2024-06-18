import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Person, Place, Qualifier } from '@medic/cht-datasource';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { CreateUserForContactsTransition } from '@mm-services/transitions/create-user-for-contacts.transition';
import sinon from 'sinon';
import { expect } from 'chai';
import { UserContactService } from '@mm-services/user-contact.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

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
  let chtDatasourceService;
  let getPerson;
  let getPlace;
  let createUserForContactsService;
  let userContactService;
  let extractLineageService;
  let transition;

  beforeEach(() => {
    getPerson = sinon.stub();
    getPlace = sinon.stub();
    chtDatasourceService = {
      bind: sinon.stub()
    };
    chtDatasourceService.bind.withArgs(Person.v1.get).resolves(getPerson);
    chtDatasourceService.bind.withArgs(Place.v1.get).resolves(getPlace);
    createUserForContactsService = {
      isBeingReplaced: sinon.stub(),
      setReplaced: sinon.stub(),
      getReplacedBy: sinon.stub(),
    };
    userContactService = { get: sinon.stub() };
    extractLineageService = { extract: ExtractLineageService.prototype.extract };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        { provide: CreateUserForContactsService, useValue: createUserForContactsService },
        { provide: UserContactService, useValue: userContactService },
        { provide: ExtractLineageService, useValue: extractLineageService },
      ]
    });

    transition = TestBed.inject(CreateUserForContactsTransition);
  });

  afterEach(() => {
    if (chtDatasourceService.bind.notCalled) {
      expect(getPerson.notCalled).to.be.true;
      expect(getPlace.notCalled).to.be.true;
    }
  });

  describe('init', () => {
    let consoleWarn;

    beforeEach(() => {
      consoleWarn = sinon.stub(console, 'warn');
    });

    afterEach(() => sinon.restore());

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

    it('returns false when no config is provided', () => {
      expect(transition.init()).to.be.false;
    });
  });

  describe('filter', () => {
    [
      [{ type: 'data_record' }],
      [{ type: 'person' }, { type: 'user-settings' }, { type: 'data_record' }],
    ].forEach(docs => {
      it('returns true when given a report', () => {
        expect(transition.filter(docs)).to.be.true;
      });
    });

    it('returns false when no documents array is provided', () => {
      expect(transition.filter()).to.be.false;
    });

    it('returns false when no documents are provided', () => {
      expect(transition.filter([])).to.be.false;
    });

    it('returns false when given documents that are not data records', () => {
      const docs = [
        { type: 'person' },
        { type: 'user-settings' },
        { type: 'something_else' },
      ];

      expect(transition.filter(docs)).to.be.false;
    });
  });

  describe('run', () => {
    beforeEach(() => transition.init({ create_user_for_contacts: { replace_forms: ['replace_user'] } }));

    it('does nothing when the array of documents is not provided', async () => {
      const docs = await transition.run();

      expect(docs).to.be.empty;
      expect(userContactService.get.callCount).to.equal(0);
      expect(chtDatasourceService.bind.notCalled).to.be.true;
      expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(0);
    });

    it('does nothing when the user is not associated with a contact', async () => {
      userContactService.get.resolves(null);

      const docs = await transition.run([REPLACE_USER_DOC]);

      expect(docs).to.deep.equal([REPLACE_USER_DOC]);
      expect(userContactService.get.callCount).to.equal(1);
      expect(chtDatasourceService.bind.notCalled).to.be.true;
      expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(0);
    });

    it('does nothing when the user is not being replaced and is not already replaced', async () => {
      userContactService.get.resolves(ORIGINAL_CONTACT);
      createUserForContactsService.isBeingReplaced.returns(false);
      const submittedDocs = [getDataRecord(), null, getDataRecord(), NEW_CONTACT, undefined];
      submittedDocs.forEach(doc => doc && deepFreeze(doc));

      const docs = await transition.run(submittedDocs);

      expect(docs).to.deep.equal([submittedDocs[0], submittedDocs[2], submittedDocs[3]]);
      expect(userContactService.get.callCount).to.equal(1);
      expect(chtDatasourceService.bind.notCalled).to.be.true;
      expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(1);
      expect(createUserForContactsService.isBeingReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
    });

    describe(`when the reports submitted include a replace user report`, () => {
      it('sets the contact as replaced when the new contact is existing', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        getPerson.resolves(NEW_CONTACT);
        const parentPlace = { ...PARENT_PLACE };
        getPlace.resolves(parentPlace);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser, {
          ...parentPlace,
          contact: {
            _id: NEW_CONTACT._id,
            parent: NEW_CONTACT.parent,
          }
        }]);
        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Person.v1.get], [Place.v1.get]]);
        expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(NEW_CONTACT._id))).to.be.true;
        expect(getPlace.calledOnceWithExactly(Qualifier.byUuid(parentPlace._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
      });

      it('sets the contact as replaced when the new contact is also being submitted', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        const parentPlace = { ...PARENT_PLACE };
        getPlace.resolves(parentPlace);

        const docs = await transition.run([NEW_CONTACT, REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([NEW_CONTACT, REPLACE_USER_DOC, originalUser, {
          ...parentPlace,
          contact: {
            _id: NEW_CONTACT._id,
            parent: NEW_CONTACT.parent,
          }
        }]);
        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Place.v1.get]]);
        expect(getPlace.calledOnceWithExactly(Qualifier.byUuid(parentPlace._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
      });

      it('re-parents new reports to existing user before replacing user again for existing replaced user', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        const replaceUserDoc = { ...REPLACE_USER_DOC, contact: { ...REPLACE_USER_DOC.contact } };
        const parentPlace = { ...PARENT_PLACE };
        getPlace.resolves(parentPlace);

        const docs0 = await transition.run([NEW_CONTACT, replaceUserDoc]);

        const updatedParentPlace = {
          ...parentPlace,
          contact: {
            _id: NEW_CONTACT._id,
            parent: NEW_CONTACT.parent,
          }
        };
        expect(docs0).to.deep.equal([NEW_CONTACT, replaceUserDoc, originalUser, updatedParentPlace]);
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
        createUserForContactsService.isBeingReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(NEW_CONTACT._id);
        getPlace.resolves(updatedParentPlace);

        const docs1 = await transition.run([secondNewContact, secondReplaceUserDoc, anotherDoc]);

        expect(docs1).to.deep.equal([secondNewContact, secondReplaceUserDoc, anotherDoc, originalUser, {
          ...updatedParentPlace,
          contact: {
            _id: secondNewContact._id,
            parent: secondNewContact.parent,
          }
        }]);
        // Reports re-parented to first new user
        [secondReplaceUserDoc, anotherDoc].forEach(doc => expect(doc.contact._id).to.equal(NEW_CONTACT._id));
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(2);
        expect(createUserForContactsService.getReplacedBy.args).to.deep.equal([[originalUser], [originalUser]]);
        // User replaced again
        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Place.v1.get]]);
        expect(getPlace.calledOnceWithExactly(Qualifier.byUuid(parentPlace._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, secondNewContact]);
      });

      it('does not assign new contact as primary contact when original contact was not primary', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        getPerson.resolves(NEW_CONTACT);
        const parentPlace = { ...PARENT_PLACE, contact: { _id: 'different-contact', } };
        getPlace.resolves(parentPlace);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser]);
        expect(parentPlace.contact).to.deep.equal({ _id: 'different-contact', });
        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Person.v1.get], [Place.v1.get]]);
        expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(NEW_CONTACT._id))).to.be.true;
        expect(getPlace.calledOnceWithExactly(Qualifier.byUuid(parentPlace._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
      });

      it('does not assign new contact as primary contact when parent doc not found', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        getPerson.resolves(NEW_CONTACT);
        getPlace.resolves(null);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser]);
        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Person.v1.get], [Place.v1.get]]);
        expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(NEW_CONTACT._id))).to.be.true;
        expect(getPlace.calledOnceWithExactly(Qualifier.byUuid(PARENT_PLACE._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
        expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, NEW_CONTACT]);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
      });

      [
        undefined,
        {}
      ].forEach(parent => {
        it('does not assign new contact as primary contact when contact has no parent', async () => {
          const originalUser = { ...ORIGINAL_CONTACT };
          userContactService.get.resolves(originalUser);
          const newContact = { ...NEW_CONTACT, parent };
          getPerson.resolves(newContact);

          const docs = await transition.run([REPLACE_USER_DOC]);

          expect(docs).to.deep.equal([REPLACE_USER_DOC, originalUser]);
          expect(userContactService.get.callCount).to.equal(1);
          expect(chtDatasourceService.bind.args).to.deep.equal([[Person.v1.get]]);
          expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(newContact._id))).to.be.true;
          expect(createUserForContactsService.setReplaced.callCount).to.equal(1);
          expect(createUserForContactsService.setReplaced.args[0]).to.deep.equal([originalUser, newContact]);
          expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
        });
      });

      [undefined, { _id: 'different_contact', }].forEach(contact => {
        it(`throws an error if the original contact being replaced does not match the user's contact`, async () => {
          userContactService.get.resolves(ORIGINAL_CONTACT);
          const replaceUserDoc = { ...REPLACE_USER_DOC, contact };

          try {
            await transition.run([replaceUserDoc]);
            expect(true).to.equal('should have thrown an error');
          } catch (err) {
            expect(err.message).to.equal(
              'Only the contact associated with the currently logged in user can be replaced.'
            );
          }

          expect(userContactService.get.callCount).to.equal(1);
          expect(chtDatasourceService.bind.notCalled).to.be.true;
          expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
          expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
        });
      });

      [undefined, {}].forEach(fields => {
        it(`throws an error when no replacement_contact_id is set`, async () => {
          userContactService.get.resolves(ORIGINAL_CONTACT);
          const replaceUserDoc = { ...REPLACE_USER_DOC, fields };

          try {
            await transition.run([replaceUserDoc]);
            expect(true).to.equal('should have thrown an error');
          } catch (err) {
            expect(err.message).to.equal('The form for replacing a user must include a replacement_contact_id field ' +
              'containing the id of the new contact.');
          }

          expect(userContactService.get.callCount).to.equal(1);
          expect(chtDatasourceService.bind.notCalled).to.be.true;
          expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
          expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(1);
        });
      });

      it(`throws an error if the new contact cannot be found`, async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        getPerson.resolves(null);

        try {
          await transition.run([REPLACE_USER_DOC]);
          expect(true).to.equal('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal(`The new contact could not be found [${NEW_CONTACT._id}].`);
        }

        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Person.v1.get]]);
        expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(NEW_CONTACT._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
      });

      it(`throws an error if an error is encountered getting the new contact`, async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        getPerson.rejects({ message: 'Server Error' });

        try {
          await transition.run([REPLACE_USER_DOC]);
          expect(true).to.equal('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal(`Server Error`);
        }

        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.args).to.deep.equal([[Person.v1.get]]);
        expect(getPerson.calledOnceWithExactly(Qualifier.byUuid(NEW_CONTACT._id))).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(2);
      });

      it('throws an error if multiple replace user reports are submitted', async () => {
        const originalUser = { ...ORIGINAL_CONTACT };
        userContactService.get.resolves(originalUser);
        const parentPlace = { ...PARENT_PLACE };
        getPlace.resolves(parentPlace);

        try {
          await transition.run([REPLACE_USER_DOC, NEW_CONTACT, REPLACE_USER_DOC]);
          expect(true).to.equal('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal(`Only one user replace form is allowed to be submitted per transaction.`);
        }

        expect(userContactService.get.callCount).to.equal(1);
        expect(chtDatasourceService.bind.notCalled).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
        expect(createUserForContactsService.isBeingReplaced.callCount).to.equal(1);
      });
    });

    describe(`when the reports submitted do not include a replace user report, but the user is replaced`, () => {
      afterEach(() => {
        // Functions from the user replace flow should not be called
        expect(chtDatasourceService.bind.notCalled).to.be.true;
        expect(createUserForContactsService.setReplaced.callCount).to.equal(0);
      });

      it('re-parents the given reports to the new contact', async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isBeingReplaced.returns(true);
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
        expect(docs).to.deep.equal([submittedDocs[0], ...submittedDocs.slice(2, 6)]);
        // Reports re-parented to original user
        dataRecords.forEach(doc => expect(doc).to.deep.equal(getDataRecord({ _id: NEW_CONTACT._id })));
        expect(userContactService.get.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });

      it('does nothing if there is no replaced by id', async () => {
        userContactService.get.resolves(ORIGINAL_CONTACT);
        createUserForContactsService.isBeingReplaced.returns(true);
        createUserForContactsService.getReplacedBy.returns(null);
        const submittedDocs: any = [deepFreeze(getDataRecord())];

        const docs = await transition.run(submittedDocs);

        expect(docs).to.deep.equal(submittedDocs);
        expect(userContactService.get.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.callCount).to.equal(1);
        expect(createUserForContactsService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });
    });
  });
});
