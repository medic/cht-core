import { Injectable } from '@angular/core';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class UserContactService {
  constructor(
    private dbService: DbService,
    private userSettingsService: UserSettingsService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
  ) {
  }

  async get({ hydrateLineage = true } = {}) {
    try {
      const user: any = await this.userSettingsService.get();
      if (!user.contact_id) {
        return;
      }
      if (hydrateLineage) {
        return await this.getContactWithLineage(user.contact_id);
      }

      return await this.getContact(user.contact_id);
    } catch (err) {
      if (err.code === 404) {
        return;
      }
      throw err;
    }
  }

  private async getContact(contactId) {
    return this.dbService
      .get()
      .get(contactId);
  }

  private async getContactWithLineage(contactId) {
    const contact = await this.lineageModelGeneratorService.contact(contactId, { merge: true });
    return contact && contact.doc;
  }
}
