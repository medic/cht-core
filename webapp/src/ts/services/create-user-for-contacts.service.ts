import { Injectable } from '@angular/core';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class CreateUserForContactsService {
  constructor(
    private settingsService: SettingsService,
    private userContactService: UserContactService,
    private dbService: DbService,
    private dbSyncService: DBSyncService,
    private sessionService: SessionService,
    private userSettingsService: UserSettingsService,
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

  async getUserId() {
    const userSettings: any = await this.userSettingsService.get();
    return userSettings.id;
  }

  setReplaced(originalContact, newContact, originalUserId) {
    if (!originalContact) {
      throw new Error('The original contact could not be found when replacing the user.');
    }
    if (!newContact) {
      throw new Error('The new contact could not be found when replacing the user.');
    }
    if (!originalContact.parent?._id || originalContact.parent._id !== newContact.parent._id) {
      throw new Error('The new contact must have the same parent as the original contact when replacing a user.');
    }
    const status = this.sessionService.isOnlineOnly() ? UserCreationStatus.READY : UserCreationStatus.PENDING;
    if (!originalContact.user_for_contact) {
      originalContact.user_for_contact = {};
    }
    originalContact.user_for_contact.replace = {
      status,
      replacement_contact_id: newContact._id,
      original_user_id: originalUserId,
    };
  }

  isReplaced(contact) {
    return !!contact.user_for_contact?.replace;
  }

  getReplacedBy(contact): string {
    return contact.user_for_contact?.replace?.replacement_contact_id;
  }

  private getReplacedStatus(contact): UserCreationStatus {
    return UserCreationStatus[contact.user_for_contact.replace.status];
  }

  private setReplacedStatus(contact, status: UserCreationStatus) {
    contact.user_for_contact.replace.status = status;
  }

  private async syncStatusChanged({ to, from }: any) {
    if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
      return;
    }

    const contact = await this.userContactService.get({ hydrateLineage: false });
    if (!contact || !this.isReplaced(contact)) {
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
  READY = 'READY' // Ready to be replaced
  // COMPLETE - Set by Sentinel when the new user has been created
  // ERROR - Set by Sentinel if a new user could not be created
}
