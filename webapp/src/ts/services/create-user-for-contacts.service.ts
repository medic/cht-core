import { Injectable } from '@angular/core';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserContactService } from '@mm-services/user-contact.service';

@Injectable({
  providedIn: 'root'
})
export class CreateUserForContactsService {
  private currentUsername: string;

  constructor(
    private settingsService: SettingsService,
    private userContactService: UserContactService,
    private dbService: DbService,
    private dbSyncService: DBSyncService,
    private sessionService: SessionService,
  ) {
    this.settingsService
      .get()
      .then((settings) => {
        if (settings?.transitions?.create_user_for_contacts) {
          this.dbSyncService.subscribe(async (status) => {
            return this.syncStatusChanged(status);
          });
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
    const originalUsername = this.getCurrentUsername();
    if (!originalUsername) {
      throw new Error('The current username could not be found when replacing the user.');
    }

    const status = this.sessionService.isOnlineOnly() ? UserCreationStatus.READY : UserCreationStatus.PENDING;
    if (!originalContact.user_for_contact) {
      originalContact.user_for_contact = {};
    }
    if (!originalContact.user_for_contact.replace) {
      originalContact.user_for_contact.replace = {};
    }
    originalContact.user_for_contact.replace[originalUsername] = {
      status,
      replacement_contact_id: newContact._id,
    };
  }

  isBeingReplaced(contact) {
    const replacement = contact.user_for_contact?.replace?.[this.getCurrentUsername()];
    return !!replacement && [UserCreationStatus.PENDING, UserCreationStatus.READY].includes(replacement.status);
  }

  getReplacedBy(contact): string | undefined {
    return contact.user_for_contact?.replace?.[this.getCurrentUsername()]?.replacement_contact_id;
  }

  private getCurrentUsername() {
    if (!this.currentUsername) {
      this.currentUsername = this.sessionService.userCtx()?.name;
    }

    return this.currentUsername;
  }

  private getReplacedStatus(contact): UserCreationStatus {
    return UserCreationStatus[contact.user_for_contact.replace[this.getCurrentUsername()].status];
  }

  private setReplacedStatus(contact, status: UserCreationStatus) {
    contact.user_for_contact.replace[this.getCurrentUsername()].status = status;
  }

  private async syncStatusChanged({ to, from }: any) {
    if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
      return;
    }

    const contact = await this.userContactService.get({ hydrateLineage: false });
    if (!contact || !this.isBeingReplaced(contact)) {
      return;
    }

    const status = this.getReplacedStatus(contact);
    if (status !== UserCreationStatus.PENDING) {
      return;
    }
    // After a user is replaced, the original contact will have status of PENDING.
    // Set to READY to trigger Sentinel to create a new user (now that all docs are synced).
    this.setReplacedStatus(contact, UserCreationStatus.READY);
    await this.dbService
      .get()
      .put(contact);
    // Make sure there is not an ongoing sync before pushing changes to contact
    if (this.dbSyncService.isSyncInProgress()) {
      await this.dbSyncService.sync();
    }
    await this.dbSyncService.sync(true);
    await this.sessionService.logout();
  }
}

enum UserCreationStatus {
  PENDING = 'PENDING', // Waiting on sync to complete
  READY = 'READY', // Ready to be replaced
  // COMPLETE - Set by Sentinel when the new user has been created
  // ERROR = 'ERROR', // - Set by Sentinel if a new user could not be created
}
