import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { assert } from 'chai';
import sinon from 'sinon';
import { CreateUserForContactsService } from '@mm-services/create-user-for-contacts.service';
import { SettingsService } from '@mm-services/settings.service';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { UserContactService } from '@mm-services/user-contact.service';

const deepFreeze = obj => {
  Object
    .keys(obj)
    .filter(prop => typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop]))
    .forEach(prop => deepFreeze(obj[prop]));
  return Object.freeze(obj);
};

const ORIGINAL_CONTACT = deepFreeze({
  _id: 'original-contact',
  parent: {
    _id: 'parent-contact'
  },
  user_for_contact: undefined
});

const ORIGINAL_USERNAME = 'original-username';

const NEW_CONTACT = deepFreeze({
  _id: 'new-contact',
  parent: {
    _id: 'parent-contact'
  }
});

const getContactWithStatus = (status: string) => ({
  _id: 'status-contact',
  parent: {
    _id: 'parent-contact'
  },
  user_for_contact: {
    replace: {
      [ORIGINAL_USERNAME]: {
        status: status,
        replacement_contact_id: NEW_CONTACT._id
      }
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
    settingsService = {
      get: sinon
        .stub()
        .resolves({ transitions: { create_user_for_contacts: true } })
    };
    userContactService = { get: sinon.stub() };
    medicDb = { put: sinon.stub() };
    dbService = {
      get: sinon
        .stub()
        .returns(medicDb)
    };
    dbSyncService = {
      subscribe: sinon.stub(),
      isSyncInProgress: sinon
        .stub()
        .returns(false),
      sync: sinon
        .stub()
        .resolves(),
    };
    sessionService = {
      userCtx: sinon
        .stub()
        .returns({ name: ORIGINAL_USERNAME }),
      isOnlineOnly: sinon
        .stub()
        .returns(false),
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

  const assertContactNotUpdated = () => {
    assert.equal(medicDb.put.callCount, 0);
    assert.equal(dbSyncService.isSyncInProgress.callCount, 0);
    assert.equal(dbSyncService.sync.callCount, 0);
    assert.equal(sessionService.logout.callCount, 0);
  };

  describe('setReplaced', () => {
    it('sets the given new contact and a status of PENDING when the user has offline role', () => {
      const originalContact = { ...ORIGINAL_CONTACT };

      service.setReplaced(originalContact, NEW_CONTACT);

      assert.deepEqual(originalContact.user_for_contact.replace[ORIGINAL_USERNAME], {
        status: 'PENDING',
        replacement_contact_id: NEW_CONTACT._id,
      });
    });

    it('sets the given new contact and a status of READY when the user has online role', () => {
      const originalContact = { ...ORIGINAL_CONTACT };
      sessionService.isOnlineOnly.returns(true);

      service.setReplaced(originalContact, NEW_CONTACT);

      assert.deepEqual(originalContact.user_for_contact.replace[ORIGINAL_USERNAME], {
        status: 'READY',
        replacement_contact_id: NEW_CONTACT._id,
      });
    });

    [
      { hello: 'world' },
      { hello: 'world', replace: { [ORIGINAL_USERNAME]: { status: 'ERROR' } } },
    ].forEach(user_for_contact => {
      it('sets the given new contact and status when the contact already has user_for_contact data', () => {
        const originalContact = { ...ORIGINAL_CONTACT, user_for_contact };

        service.setReplaced(originalContact, NEW_CONTACT);

        assert.deepEqual(originalContact.user_for_contact, {
          hello: 'world',
          replace: {
            [ORIGINAL_USERNAME]: {
              status: 'PENDING',
              replacement_contact_id: NEW_CONTACT._id,
            }
          }
        });
      });
    });

    it('sets the given new contact and status when the contact already has replace data for a different user', () => {
      const originalContact = {
        ...ORIGINAL_CONTACT,
        user_for_contact: {
          replace: {
            otherUser: {
              status: 'ERROR'
            }
          }
        }
      };

      service.setReplaced(originalContact, NEW_CONTACT);

      assert.deepEqual(originalContact.user_for_contact, {
        replace: {
          otherUser: {
            status: 'ERROR'
          },
          [ORIGINAL_USERNAME]: {
            status: 'PENDING',
            replacement_contact_id: NEW_CONTACT._id,
          }
        }
      });
    });

    it('throws an error when no original contact is provided', () => {
      assert.throws(
        () => service.setReplaced(null, NEW_CONTACT),
        'The original contact could not be found when replacing the user.'
      );
    });

    it('throws an error when no new contact is provided', () => {
      assert.throws(
        () => service.setReplaced(ORIGINAL_CONTACT, null),
        'The new contact could not be found when replacing the user.'
      );
    });

    it('throws an error when the original contact and the new contact do not have the same parent', () => {
      const originalContact = { ...ORIGINAL_CONTACT, parent: { _id: 'different-parent' } };

      assert.throws(
        () => service.setReplaced(originalContact, NEW_CONTACT),
        'The new contact must have the same parent as the original contact when replacing a user.'
      );
    });

    it('throws an error when the original contact does not have a parent', () => {
      const originalContact = { ...ORIGINAL_CONTACT, parent: undefined };

      assert.throws(
        () => service.setReplaced(originalContact, NEW_CONTACT),
        'The new contact must have the same parent as the original contact when replacing a user.'
      );
    });

    it('throws an error when the new contact does not have a parent', () => {
      const newContact = { ...NEW_CONTACT, parent: {} };

      assert.throws(
        () => service.setReplaced(ORIGINAL_CONTACT, newContact),
        'The new contact must have the same parent as the original contact when replacing a user.'
      );
    });

    [
      null,
      {}
    ].forEach(userCtx => {
      it('throws an error when no username is found', () => {
        sessionService.userCtx.returns(userCtx);
        assert.throws(
          () => service.setReplaced(ORIGINAL_CONTACT, NEW_CONTACT),
          'The current username could not be found when replacing the user.'
        );
      });
    });
  });

  describe('isReplaced', () => {
    [
      'PENDING',
      'READY',
      'COMPLETE',
    ].forEach(status => {
      it(`returns true when the given contact is replaced with status: ${status}`, () => {
        const pendingContact = getContactWithStatus(status);
        assert.isTrue(service.isReplaced(pendingContact));
      });
    });

    it(`returns true when the given contact is replaced with status: ERROR`, () => {
      const pendingContact = getContactWithStatus('ERROR');
      assert.isFalse(service.isReplaced(pendingContact));
    });

    it('returns false when the given contact is not replaced', () => {
      assert.isFalse(service.isReplaced(ORIGINAL_CONTACT));
    });

    [
      {},
      { replace: {} },
      { replace: { otheruser: { status: 'PENDING' } } },
    ].forEach(user_for_contact => {
      it('returns false when the given contact has user_for_contact data but is not replaced', () => {
        const originalContact = { ...ORIGINAL_CONTACT, user_for_contact };
        assert.isFalse(service.isReplaced(originalContact));
      });
    });

    it('returns false when no username is found', () => {
      sessionService.userCtx.returns(null);
      const pendingContact = getContactWithStatus(status);
      assert.isFalse(service.isReplaced(pendingContact));
    });
  });

  describe('getReplacedBy', () => {
    it('returns the new contact when the given contact is replaced', () => {
      const pendingContact = getContactWithStatus('PENDING');
      assert.equal(service.getReplacedBy(pendingContact), NEW_CONTACT._id);
    });

    it('returns undefined when the given contact is not replaced', () => {
      assert.isUndefined(service.getReplacedBy(ORIGINAL_CONTACT));
    });

    [
      {},
      { replace: {} },
      { replace: { otheruser: { status: 'PENDING' } } },
    ].forEach(user_for_contact => {
      it('returns undefined when the given contact has user_for_contact data but is not replaced', () => {
        const originalContact = { ...ORIGINAL_CONTACT, user_for_contact };
        assert.isUndefined(service.getReplacedBy(originalContact));
      });
    });

    it('returns undefined when no username is found', () => {
      sessionService.userCtx.returns(null);
      const pendingContact = getContactWithStatus('PENDING');
      assert.isUndefined(service.getReplacedBy(pendingContact));
    });
  });

  describe('syncStatusChanged', () => {
    const SYNC_STATUS = { to: SyncStatus.Success, from: SyncStatus.Success };

    it('updates contact with PENDING status to READY and logs out the user', async () => {
      const pendingContact = getContactWithStatus('PENDING');
      userContactService.get.resolves(pendingContact);


      assert.equal(dbSyncService.subscribe.callCount, 1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      assert.equal(dbService.get.callCount, 1);
      assert.equal(userContactService.get.callCount, 1);
      assert.deepEqual(userContactService.get.args[0], [{ hydrateLineage: false }]);
      assert.equal(medicDb.put.callCount, 1);
      assert.deepEqual(pendingContact.user_for_contact.replace[ORIGINAL_USERNAME], {
        replacement_contact_id: NEW_CONTACT._id,
        status: 'READY'
      });
      assert.deepEqual(medicDb.put.args[0], [pendingContact]);
      assert.equal(dbSyncService.isSyncInProgress.callCount, 1);
      assert.equal(dbSyncService.sync.callCount, 1);
      assert.deepEqual(dbSyncService.sync.args[0], [true]);
      assert.equal(sessionService.logout.callCount, 1);
    });

    [
      { to: SyncStatus.Success, from: SyncStatus.InProgress },
      { to: SyncStatus.InProgress, from: SyncStatus.Success },
      { from: SyncStatus.Success },
      { to: SyncStatus.Success },
      {}
    ].forEach(syncStatus => {
      it(`does nothing when the sync status is: ${JSON.stringify(syncStatus)}`, async () => {
        assert.equal(dbSyncService.subscribe.callCount, 1);
        const syncStatusChanged = dbSyncService.subscribe.args[0][0];
        await syncStatusChanged(syncStatus);

        assert.equal(userContactService.get.callCount, 0);
        assert.equal(dbService.get.callCount, 0);
        assertContactNotUpdated();
      });
    });

    it('does not update contact that is not being replaced', async () => {
      userContactService.get.resolves(ORIGINAL_CONTACT);

      assert.equal(dbSyncService.subscribe.callCount, 1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      assert.equal(dbService.get.callCount, 0);
      assert.equal(userContactService.get.callCount, 1);
      assert.deepEqual(userContactService.get.args[0], [{ hydrateLineage: false }]);
      assert.isUndefined(ORIGINAL_CONTACT.user_for_contact);
      assertContactNotUpdated();
    });

    it('does nothing when there is no contact associated with the user', async () => {
      userContactService.get.resolves(undefined);

      assert.equal(dbSyncService.subscribe.callCount, 1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      assert.equal(userContactService.get.callCount, 1);
      assert.equal(dbService.get.callCount, 0);
      assertContactNotUpdated();
    });

    [
      'READY',
      'COMPLETE',
      'ERROR',
    ].forEach(status => {
      it('does not update replaced contact that is not PENDING', async () => {
        const completeContact = getContactWithStatus(status);
        userContactService.get.resolves(completeContact);

        assert.equal(dbSyncService.subscribe.callCount, 1);
        const syncStatusChanged = dbSyncService.subscribe.args[0][0];
        await syncStatusChanged(SYNC_STATUS);

        assert.equal(dbService.get.callCount, 0);
        assert.equal(userContactService.get.callCount, 1);
        assert.deepEqual(userContactService.get.args[0], [{ hydrateLineage: false }]);
        assert.equal(completeContact.user_for_contact.replace[ORIGINAL_USERNAME].status, status);
        assertContactNotUpdated();
      });
    });

    it('waits for sync in progress to finish before syncing updated contact', async () => {
      const pendingContact = getContactWithStatus('PENDING');
      userContactService.get.resolves(pendingContact);
      dbSyncService.isSyncInProgress.resolves(true);

      assert.equal(dbSyncService.subscribe.callCount, 1);
      const syncStatusChanged = dbSyncService.subscribe.args[0][0];
      await syncStatusChanged(SYNC_STATUS);

      assert.equal(dbService.get.callCount, 1);
      assert.equal(userContactService.get.callCount, 1);
      assert.deepEqual(userContactService.get.args[0], [{ hydrateLineage: false }]);
      assert.equal(medicDb.put.callCount, 1);
      assert.deepEqual(pendingContact.user_for_contact.replace[ORIGINAL_USERNAME], {
        replacement_contact_id: NEW_CONTACT._id,
        status: 'READY'
      });
      assert.deepEqual(medicDb.put.args[0], [pendingContact]);
      assert.equal(dbSyncService.isSyncInProgress.callCount, 1);
      assert.equal(dbSyncService.sync.callCount, 2);
      assert.deepEqual(dbSyncService.sync.args[0], []);
      assert.deepEqual(dbSyncService.sync.args[1], [true]);
      assert.equal(sessionService.logout.callCount, 1);
    });
  });
});
