import { Injectable } from '@angular/core';
import { UserContactService } from '@mm-services/user-contact.service';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class UserReplaceService {
  constructor(
    private settingsService:SettingsService,
    private userContactService: UserContactService,
    private dbService: DbService,
    private dbSyncService: DBSyncService,
    private sessionService: SessionService,
  ) {
    this.settingsService.get().then(settings => {
      if(settings?.transitions?.user_replace) {
        this.dbSyncService.subscribe(this.syncStatusChanged(
          this.userContactService,
          this.dbService,
          this.dbSyncService,
          this.sessionService
        ));
      }
    });
  }

  setReplaced(originalContact, newContact) {
    if (!originalContact) {
      throw new Error('The original contact could not be found when replacing the user.');
    }
    if (!newContact) {
      throw new Error('The new contact could not be found when replacing the user.');
    }
    if (!originalContact.parent?._id || originalContact.parent._id !== newContact.parent._id) {
      throw new Error('The new contact must have the same parent as the original contact when replacing a user.');
    }
    // TODO Currently the transitions are not run for online users so this is not used.
    const status = this.sessionService.isOnlineOnly() ? ReplaceStatus.READY : ReplaceStatus.PENDING;
    originalContact.replaced = { status, by: newContact._id };
  }

  isReplaced(contact): boolean {
    return contact.replaced;
  }

  getReplacedBy(contact): string {
    return contact.replaced?.by;
  }

  private getStatus(contact): ReplaceStatus {
    return ReplaceStatus[contact.replaced.status];
  }

  private setStatus(contact, status: ReplaceStatus) {
    contact.replaced.status = status;
  }

  private syncStatusChanged(
    userContactService: UserContactService,
    dbService: DbService,
    dbSyncService: DBSyncService,
    sessionService: SessionService
  ) {
    return async({ to, from }) => {
      if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
        return;
      }

      const contact = await userContactService.get();
      if (!contact || !this.isReplaced(contact)) {
        return;
      }

      const status = this.getStatus(contact);
      if (status !== ReplaceStatus.PENDING) {
        return;
      }
      // After a user is replaced, the original contact will have status of PENDING.
      // Set to READY to trigger Sentinel to create a new user (now that all docs are synced).
      this.setStatus(contact, ReplaceStatus.READY);
      await dbService.get().put(contact);
      // Make sure there is not an ongoing sync before pushing changes to contact
      if(dbSyncService.isSyncInProgress()) {
        await dbSyncService.sync();
      }
      await dbSyncService.sync(true);
      await sessionService.logout();
    };
  }
}

enum ReplaceStatus {
  PENDING = 'PENDING', // Waiting on sync to complete
  READY = 'READY' // Ready to be replaced
  // COMPLETE - Set by Sentinel when the new user has been created
  // ERROR - Set by Sentinel if a new user could not be created
}
