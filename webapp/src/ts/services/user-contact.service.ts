import {Injectable} from '@angular/core';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

@Injectable({
  providedIn: 'root'
})
export class UserContactService {
  constructor(
    private userSettingsService:UserSettingsService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
  ) {
  }

  get() {
    return this
      .userSettingsService
      .get()
      .then((user:any) => {
        if (!user.contact_id) {
          return;
        }
        return this.lineageModelGeneratorService.contact(user.contact_id, { merge: true });
      })
      .then((contact) => {
        return contact && contact.doc;
      })
      .catch((err) => {
        if (err.code === 404) {
          return;
        }
        throw err;
      });
  }
}
