import { Injectable } from '@angular/core';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class CreateUserForContactsService {
  constructor(
    private settingsService: SettingsService,
    private userSettingsService: UserSettingsService,
    private dbService: DbService,
    private dbSyncService: DBSyncService,
    private sessionService: SessionService,
  ) {
    this.settingsService
      .get()
      .then((settings) => {
        if (settings?.transitions?.create_user_for_contacts) {
          this.dbSyncService.subscribe(async(status) => {
            return this.syncStatusChanged(status);
          });
        }
      });
  }

  async getUserContact() {
    const { contact_id }: any = await this.userSettingsService.get();
    if (!contact_id) {
      return;
    }
    return this.dbService
      .get()
      .get(contact_id)
      .catch(err => {
        if (err.status === 404) {
          return;
        }
        throw err;
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
    const status = this.sessionService.isOnlineOnly() ? UserCreationStatus.READY : UserCreationStatus.PENDING;
    if(!originalContact.user_for_contact) {
      originalContact.user_for_contact = {};
    }
    originalContact.user_for_contact.replaced = { status, by: newContact._id };
  }

  isReplaced(contact) {
    return !!contact.user_for_contact?.replaced;
  }

  getReplacedBy(contact): string {
    return contact.user_for_contact?.replaced?.by;
  }

  private getReplacedStatus(contact): UserCreationStatus {
    return UserCreationStatus[contact.user_for_contact.replaced.status];
  }

  private setReplacedStatus(contact, status: UserCreationStatus) {
    contact.user_for_contact.replaced.status = status;
  }

  private async syncStatusChanged({ to, from }: any) {
    if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
      return;
    }

    const contact = await this.getUserContact();
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
    await this.dbService.get().put(contact);
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
