import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { SettingsService } from '@mm-services/settings.service';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { UserContactService } from '@mm-services/user-contact.service';

const ORIGINAL_CONTACT = {
  _id: 'original-contact',
  parent: {
    _id: 'parent-contact'
  },
  user_for_contact: undefined
};

const NEW_CONTACT = {
  _id: 'new-contact',
  parent: {
    _id: 'parent-contact'
  }
};

const getContactWithStatus = (status: string) => ({
  _id: 'status-contact',
  parent: {
    _id: 'parent-contact'
  },
  user_for_contact: {
    replace: {
      status: status,
      replacement_contact_id: NEW_CONTACT._id
    }
  }
});

describe('Create User for Contacts service', () => {
  let settingsService;
  let userContactService;
  let medicDb;
  let dbService;
  let dbSyncService;
  let sessionService;
  let service;

  beforeEach(() => {
    settingsService = { get: sinon.stub().resolves({ transitions: { create_user_for_contacts: true } }) };
    userContactService = { get: sinon.stub() };
    medicDb = { put: sinon.stub() };
    dbService = { get: sinon.stub().returns(medicDb) };
    dbSyncService = {
      subscribe: sinon.stub(),
      isSyncInProgress: sinon.stub().returns(false),
      sync: sinon.stub().resolves(),
    };
    sessionService = {
      isOnlineOnly: sinon.stub().returns(false),
      logout: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: SettingsService, useValue: settingsService },
        { provide: UserContactService, useValue: userContactService },
        { provide: DbService, useValue: dbService },
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: SessionService, useValue: sessionService },
      ]
    });

    service = TestBed.inject(CreateUserForContactsService);
  });

  afterEach(() => sinon.restore());

  const assertContactNotUpdated = () => {
    expect(medicDb.put.callCount).to.equal(0);
    expect(dbSyncService.isSyncInProgress.callCount).to.equal(0);
    expect(dbSyncService.sync.callCount).to.equal(0);
    expect(sessionService.logout.callCount).to.equal(0);
  };

  describe('setReplaced', () => {
    it('sets the given new contact and a status of PENDING when the user has offline role', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT);

      service.setReplaced(originalContact, NEW_CONTACT);

      expect(originalContact.user_for_contact.replace).to.deep.equal({
        status: 'PENDING',
        replacement_contact_id: NEW_CONTACT._id
      });
    });

    it('sets the given new contact and a status of READY when the user has online role', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT);
      sessionService.isOnlineOnly.returns(true);

      service.setReplaced(originalContact, NEW_CONTACT);

      expect(originalContact.user_for_contact.replace).to.deep.equal({
        status: 'READY',
        replacement_contact_id: NEW_CONTACT._id
      });
    });

    [
      { hello: 'world' },
      { hello: 'world', replace: { status: 'ERROR' } },
    ].forEach(user_for_contact => {
      it('sets the given new contact and status when the contact already has user_for_contact data', () => {
        const originalContact = Object.assign({}, ORIGINAL_CONTACT, { user_for_contact });

        service.setReplaced(originalContact, NEW_CONTACT);

        expect(originalContact.user_for_contact).to.deep.equal({
          hello: 'world',
          replace:{
            status: 'PENDING',
            replacement_contact_id: NEW_CONTACT._id
          }
        });
      });
    });

    it('throws an error when no original contact is provided', () => {
      expect(() => service.setReplaced(null, NEW_CONTACT))
        .to.throw('The original contact could not be found when replacing the user.');
    });

    it('throws an error when no new contact is provided', () => {
      expect(() => service.setReplaced(ORIGINAL_CONTACT, null))
        .to.throw('The new contact could not be found when replacing the user.');
    });

    it('throws an error when the original contact and the new contact do not have the same parent', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { parent: { _id: 'different-parent' } });

      expect(() => service.setReplaced(originalContact, NEW_CONTACT))
        .to.throw('The new contact must have the same parent as the original contact when replacing a user.');
    });

    it('throws an error when the original contact does not have a parent', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { parent: undefined });

      expect(() => service.setReplaced(originalContact, NEW_CONTACT))
        .to.throw('The new contact must have the same parent as the original contact when replacing a user.');
    });

    it('throws an error when the new contact does not have a parent', () => {
      const newContact = Object.assign({}, NEW_CONTACT, { parent: {} });

      expect(() => service.setReplaced(ORIGINAL_CONTACT, newContact))
        .to.throw('The new contact must have the same parent as the original contact when replacing a user.');
    });
  });

  describe('isReplaced', () => {
    [
      'PENDING',
      'READY',
      'COMPLETE',
      'ERROR',
    ].forEach(status => {
      it(`returns true when the given contact is replaced with status: ${status}`, () => {
        const pendingContact = getContactWithStatus(status);
        expect(service.isReplaced(pendingContact)).to.be.true;
      });
    });

    it('returns false when the given contact is not replaced', () => {
      expect(service.isReplaced(ORIGINAL_CONTACT)).to.be.false;
    });

    it('returns false when the given contact has user_for_contact data but is not replaced', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { user_for_contact: {} });
      expect(service.isReplaced(originalContact)).to.be.false;
    });
  });

  describe('getReplacedBy', () => {
    it('returns the new contact when the given contact is replaced', () => {
      const pendingContact = getContactWithStatus('PENDING');
      expect(service.getReplacedBy(pendingContact)).to.equal(NEW_CONTACT._id);
    });

    it('returns undefined when the given contact is not replaced', () => {
      expect(service.getReplacedBy(ORIGINAL_CONTACT)).to.equal(undefined);
    });

    it('returns false when the given contact has user_for_contact data but is not replaced', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT, { user_for_contact: {} });
      expect(service.isReplaced(originalContact)).to.be.false;
    });
  });

  describe('syncStatusChanged', () => {
    const SYNC_STATUS = { to: SyncStatus.Success, from: SyncStatus.Success };

    it('updates contact with PENDING status to READY and logs out the user', async() => {
      const pendingContact = getContactWithStatus('PENDING');
      userContactService.get.resolves(pendingContact);


      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(dbService.get.callCount).to.equal(1);
      expect(userContactService.get.callCount).to.equal(1);
      expect(userContactService.get.args[0]).to.deep.equal([{ hydrateLineage: false }]);
      expect(medicDb.put.callCount).to.equal(1);
      expect(pendingContact.user_for_contact.replace).to.deep.equal({
        replacement_contact_id: NEW_CONTACT._id,
        status: 'READY'
      });
      expect(medicDb.put.args[0]).to.deep.equal([pendingContact]);
      expect(dbSyncService.isSyncInProgress.callCount).to.equal(1);
      expect(dbSyncService.sync.callCount).to.equal(1);
      expect(dbSyncService.sync.args[0]).to.deep.equal([true]);
      expect(sessionService.logout.callCount).to.equal(1);
    });

    [
      { to: SyncStatus.Success, from: SyncStatus.InProgress },
      { to: SyncStatus.InProgress, from: SyncStatus.Success },
      { from: SyncStatus.Success },
      { to: SyncStatus.Success },
      {}
    ].forEach(syncStatus => {
      it(`does nothing when the sync status is: ${JSON.stringify(syncStatus)}`, async() => {
        expect(dbSyncService.subscribe.callCount).to.equal(1);
        const syncStatusChanged = dbSyncService.subscribe.args[0][0];
        await syncStatusChanged(syncStatus);

        expect(userContactService.get.callCount).to.equal(0);
        expect(dbService.get.callCount).to.equal(0);
        assertContactNotUpdated();
      });
    });

    it('does not update contact that is not being replaced', async() => {
      userContactService.get.resolves(ORIGINAL_CONTACT);

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(dbService.get.callCount).to.equal(0);
      expect(userContactService.get.callCount).to.equal(1);
      expect(userContactService.get.args[0]).to.deep.equal([{ hydrateLineage: false }]);
      expect(ORIGINAL_CONTACT.user_for_contact).to.be.undefined;
      assertContactNotUpdated();
    });

    it('does nothing when there is no contact associated with the user', async() => {
      userContactService.get.resolves(undefined);

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(userContactService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      assertContactNotUpdated();
    });

    [
      'READY',
      'COMPLETE',
      'ERROR',
    ].forEach(status => {
      it('does not update replaced contact that is not PENDING', async() => {
        const completeContact = getContactWithStatus(status);
        userContactService.get.resolves(completeContact);

        expect(dbSyncService.subscribe.callCount).to.equal(1);
        const syncStatusChanged = dbSyncService.subscribe.args[0][0];
        await syncStatusChanged(SYNC_STATUS);

        expect(dbService.get.callCount).to.equal(0);
        expect(userContactService.get.callCount).to.equal(1);
        expect(userContactService.get.args[0]).to.deep.equal([{ hydrateLineage: false }]);
        expect(completeContact.user_for_contact.replace.status).to.equal(status);
        assertContactNotUpdated();
      });
    });

    it('waits for sync in progress to finish before syncing updated contact', async() => {
      const pendingContact = getContactWithStatus('PENDING');
      userContactService.get.resolves(pendingContact);
      dbSyncService.isSyncInProgress.resolves(true);

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(dbService.get.callCount).to.equal(1);
      expect(userContactService.get.callCount).to.equal(1);
      expect(userContactService.get.args[0]).to.deep.equal([{ hydrateLineage: false }]);
      expect(medicDb.put.callCount).to.equal(1);
      expect(pendingContact.user_for_contact.replace).to.deep.equal({
        replacement_contact_id: NEW_CONTACT._id,
        status: 'READY'
      });
      expect(medicDb.put.args[0]).to.deep.equal([pendingContact]);
      expect(dbSyncService.isSyncInProgress.callCount).to.equal(1);
      expect(dbSyncService.sync.callCount).to.equal(2);
      expect(dbSyncService.sync.args[0]).to.deep.equal([]);
      expect(dbSyncService.sync.args[1]).to.deep.equal([true]);
      expect(sessionService.logout.callCount).to.equal(1);
    });
  });
});
