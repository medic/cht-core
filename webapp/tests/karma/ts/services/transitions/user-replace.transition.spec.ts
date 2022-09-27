import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { DbService } from '@mm-services/db.service';
import { UserReplaceService } from '@mm-services/user-replace.service';
import { UserReplaceTransition } from '@mm-services/transitions/user-replace.transition';
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

describe('User Replace Transition', () => {
  let medicDb;
  let dbService;
  let userReplaceService;
  let transition;

  beforeEach(() => {
    medicDb = { get: sinon.stub() };
    dbService = { get: sinon.stub().returns(medicDb) };
    userReplaceService = {
      getUserContact: sinon.stub(),
      isReplaced: sinon.stub(),
      setReplaced: sinon.stub(),
      getReplacedBy: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: DbService, useValue: dbService },
        { provide: UserReplaceService, useValue: userReplaceService },
      ]
    });

    transition = TestBed.inject(UserReplaceTransition);
  });

  afterEach(() => sinon.restore());

  describe('init', () => {
    it('returns true', () => {
      expect(transition.init()).to.be.true;
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
    it('does nothing when the user is not associated with a contact', async () => {
      userReplaceService.getUserContact.resolves(null);

      const docs = await transition.run([REPLACE_USER_DOC]);

      expect(docs).to.deep.equal([REPLACE_USER_DOC]);
      expect(userReplaceService.getUserContact.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
      expect(userReplaceService.setReplaced.callCount).to.equal(0);
      expect(userReplaceService.isReplaced.callCount).to.equal(0);
    });

    it('does nothing when the user is not being replaced or is not already replaced', async () => {
      userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
      userReplaceService.isReplaced.resolves(false);
      const submittedDocs = [getDataRecord(), getDataRecord(), NEW_CONTACT];

      const docs = await transition.run(submittedDocs);

      expect(docs).to.deep.equal(submittedDocs);
      expect(userReplaceService.getUserContact.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
      expect(userReplaceService.setReplaced.callCount).to.equal(0);
      expect(userReplaceService.isReplaced.callCount).to.equal(1);
      expect(userReplaceService.isReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
    });

    describe(`when the reports submitted include a replace user report`, () => {
      // Function from the re-parent reports flow should not be called
      afterEach(() => expect(userReplaceService.isReplaced.callCount).to.equal(0));

      it('sets the contact as replaced when the new contact is existing', async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
        medicDb.get.resolves(NEW_CONTACT);

        const docs = await transition.run([REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([REPLACE_USER_DOC, ORIGINAL_CONTACT]);
        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(userReplaceService.setReplaced.callCount).to.equal(1);
        expect(userReplaceService.setReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT, NEW_CONTACT]);
      });

      it('sets the contact as replaced when the new contact is also being submitted', async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);

        const docs = await transition.run([NEW_CONTACT, REPLACE_USER_DOC]);

        expect(docs).to.deep.equal([NEW_CONTACT, REPLACE_USER_DOC, ORIGINAL_CONTACT]);
        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(userReplaceService.setReplaced.callCount).to.equal(1);
        expect(userReplaceService.setReplaced.args[0]).to.deep.equal([ORIGINAL_CONTACT, NEW_CONTACT]);
      });

      it(`throws an error if the original contact being replaced does not match the user's contact`, async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
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

        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(userReplaceService.setReplaced.callCount).to.equal(0);
      });

      it(`throws an error if the new contact cannot be found`, async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
        medicDb.get.rejects({ status: 404 });

        try {
          await transition.run([REPLACE_USER_DOC]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to
            .equal(`The new contact could not be found [${NEW_CONTACT._id}].`);
        }

        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(userReplaceService.setReplaced.callCount).to.equal(0);
      });

      it(`throws an error if an error is encountered getting the new contact`, async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
        medicDb.get.rejects({ message: 'Server Error' });

        try {
          await transition.run([REPLACE_USER_DOC]);
          expect.fail('should have thrown an error');
        } catch (err) {
          expect(err.message).to.equal(`Server Error`);
        }

        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(dbService.get.callCount).to.equal(1);
        expect(medicDb.get.callCount).to.equal(1);
        expect(medicDb.get.args[0]).to.deep.equal([NEW_CONTACT._id]);
        expect(userReplaceService.setReplaced.callCount).to.equal(0);
      });
    });

    describe(`when the reports submitted do not include a replace user report, but the user is replaced`, () => {
      afterEach(() => {
        // Functions from the user replace flow should not be called
        expect(dbService.get.callCount).to.equal(0);
        expect(medicDb.get.callCount).to.equal(0);
        expect(userReplaceService.setReplaced.callCount).to.equal(0);
      });

      it('re-parents the given reports to the new contact', async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
        userReplaceService.isReplaced.resolves(true);
        userReplaceService.getReplacedBy.resolves(NEW_CONTACT._id);
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
        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(userReplaceService.getReplacedBy.callCount).to.equal(1);
        expect(userReplaceService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });

      it('does nothing if there is no replaced by id', async () => {
        userReplaceService.getUserContact.resolves(ORIGINAL_CONTACT);
        userReplaceService.isReplaced.resolves(true);
        userReplaceService.getReplacedBy.resolves(null);
        const submittedDocs: any = [getDataRecord()];

        const docs = await transition.run(submittedDocs);

        expect(docs).to.deep.equal(submittedDocs);
        expect(userReplaceService.getUserContact.callCount).to.equal(1);
        expect(userReplaceService.getReplacedBy.callCount).to.equal(1);
        expect(userReplaceService.getReplacedBy.args[0]).to.deep.equal([ORIGINAL_CONTACT]);
      });
    });
  });
});
