import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { SettingsService } from '@mm-services/settings.service';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

const ORIGINAL_CONTACT = {
  _id: 'original-contact',
  parent: {
    _id: 'parent-contact'
  },
  replaced: undefined
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
  replaced: {
    status: status,
    by: NEW_CONTACT._id
  }
});

describe('User Replace service', () => {
  let settingsService;
  let userSettingsService;
  let medicDb;
  let dbService;
  let dbSyncService;
  let sessionService;
  let service;

  beforeEach(() => {
    settingsService = { get: sinon.stub().resolves({ transitions: { user_replace: true } }) };
    userSettingsService = { get: sinon.stub().resolves({}) };
    medicDb = { get: sinon.stub(), put: sinon.stub() };
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
        { provide: UserSettingsService, useValue: userSettingsService },
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

  describe('getUserContact', () => {
    it('returns the user contact', async () => {
      userSettingsService.get.resolves({ contact_id: ORIGINAL_CONTACT._id });
      medicDb.get.withArgs(ORIGINAL_CONTACT._id).resolves(ORIGINAL_CONTACT);

      const userContact = await service.getUserContact();

      expect(userContact).to.equal(ORIGINAL_CONTACT);
      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(1);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([ORIGINAL_CONTACT._id]);
    });

    it('returns undefined if the user has no contact id', async () => {
      userSettingsService.get.resolves({ });

      const userContact = await service.getUserContact();

      expect(userContact).to.be.undefined;
      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
    });

    it(`returns undefined if the user's contact id is not associated with any document`, async () => {
      userSettingsService.get.resolves({ contact_id: ORIGINAL_CONTACT._id });
      medicDb.get.withArgs(ORIGINAL_CONTACT._id).rejects({ status: 404 });

      const userContact = await service.getUserContact();

      expect(userContact).to.be.undefined;
      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(1);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([ORIGINAL_CONTACT._id]);
    });

    it(`throws an error is an error is encountered getting the user's contact`, async () => {
      userSettingsService.get.resolves({ contact_id: ORIGINAL_CONTACT._id });
      medicDb.get.withArgs(ORIGINAL_CONTACT._id).rejects({ message: 'Server Error' });

      try {
        await service.getUserContact();
        expect.fail('should have thrown an error');
      } catch (err) {
        expect(err.message).to.equal('Server Error');
      }

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(1);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([ORIGINAL_CONTACT._id]);
    });
  });

  describe('setReplaced', () => {
    it('sets the given new contact and a status of PENDING when the user is offline', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT);

      service.setReplaced(originalContact, NEW_CONTACT);

      expect(originalContact.replaced).to.deep.equal({
        status: 'PENDING',
        by: NEW_CONTACT._id
      });
    });

    it('sets the given new contact and a status of READY when the user is online', () => {
      const originalContact = Object.assign({}, ORIGINAL_CONTACT);
      sessionService.isOnlineOnly.returns(true);

      service.setReplaced(originalContact, NEW_CONTACT);

      expect(originalContact.replaced).to.deep.equal({
        status: 'READY',
        by: NEW_CONTACT._id
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
    it('returns true when the given contact is replaced', () => {
      const pendingContact = getContactWithStatus('PENDING');
      expect(service.isReplaced(pendingContact)).to.satisfy(replaced => replaced);
    });

    it('returns false when the given contact is not replaced', () => {
      expect(service.isReplaced(ORIGINAL_CONTACT)).to.satisfy(replaced => !replaced);
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
  });

  describe('syncStatusChanged', () => {
    const SYNC_STATUS = { to: SyncStatus.Success, from: SyncStatus.Success };

    it('updates contact with PENDING status to READY and logs out the user', async() => {
      const pendingContact = getContactWithStatus('PENDING');
      userSettingsService.get.resolves({ contact_id: pendingContact._id });
      medicDb.get.withArgs(pendingContact._id).resolves(pendingContact);


      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(2);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([pendingContact._id]);
      expect(medicDb.put.callCount).to.equal(1);
      const updatedContact = Object.assign({}, pendingContact, { replaced: { by: NEW_CONTACT._id, status: 'READY' } });
      expect(medicDb.put.args[0]).to.deep.equal([updatedContact]);
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

        expect(userSettingsService.get.callCount).to.equal(0);
        expect(dbService.get.callCount).to.equal(0);
        assertContactNotUpdated();
      });
    });

    it('does not update contact that is not being replaced', async() => {
      userSettingsService.get.resolves({ contact_id: ORIGINAL_CONTACT._id });
      medicDb.get.withArgs(ORIGINAL_CONTACT._id).resolves(ORIGINAL_CONTACT);

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(1);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([ORIGINAL_CONTACT._id]);
      expect(ORIGINAL_CONTACT.replaced).to.be.undefined;
      assertContactNotUpdated();
    });

    it('does nothing when there is no contact associated with the user', async() => {
      userSettingsService.get.resolves({});

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(0);
      expect(medicDb.get.callCount).to.equal(0);
      assertContactNotUpdated();
    });

    it('does not update replaced contact that is not PENDING', async() => {
      const completeContact = getContactWithStatus('COMPLETE');
      userSettingsService.get.resolves({ contact_id: completeContact._id });
      medicDb.get.withArgs(completeContact._id).resolves(completeContact);

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(1);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([completeContact._id]);
      expect(completeContact.replaced.status).to.equal('COMPLETE');
      assertContactNotUpdated();
    });

    it('waits for sync in progress to finish before syncing updated contact', async() => {
      const pendingContact = getContactWithStatus('PENDING');
      userSettingsService.get.resolves({ contact_id: pendingContact._id });
      medicDb.get.withArgs(pendingContact._id).resolves(pendingContact);
      dbSyncService.isSyncInProgress.resolves(true);

      expect(dbSyncService.subscribe.callCount).to.equal(1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      expect(userSettingsService.get.callCount).to.equal(1);
      expect(dbService.get.callCount).to.equal(2);
      expect(medicDb.get.callCount).to.equal(1);
      expect(medicDb.get.args[0]).to.deep.equal([pendingContact._id]);
      expect(medicDb.put.callCount).to.equal(1);
      const updatedContact = Object.assign({}, pendingContact, { replaced: { by: NEW_CONTACT._id, status: 'READY' } });
      expect(medicDb.put.args[0]).to.deep.equal([updatedContact]);
      expect(dbSyncService.isSyncInProgress.callCount).to.equal(1);
      expect(dbSyncService.sync.callCount).to.equal(2);
      expect(dbSyncService.sync.args[0]).to.deep.equal([]);
      expect(dbSyncService.sync.args[1]).to.deep.equal([true]);
      expect(sessionService.logout.callCount).to.equal(1);
    });
  });
});
