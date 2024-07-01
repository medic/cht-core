import { Injectable } from '@angular/core';
import { Person, Qualifier } from '@medic/cht-datasource';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

@Injectable({
  providedIn: 'root'
})
export class UserContactService {
  constructor(
    private userSettingsService: UserSettingsService,
    private chtDatasourceService: CHTDatasourceService,
  ) {
  }

  async get({ hydrateLineage = true } = {}) {
    const user: any = await this.getUserSettings();
    if (!user?.contact_id) {
      return null;
    }
    const getPerson = await this.chtDatasourceService.bind(hydrateLineage ? Person.v1.getWithLineage : Person.v1.get);
    return await getPerson(Qualifier.byUuid(user.contact_id));
  }

  private getUserSettings = async () => {
    try {
      return await this.userSettingsService.get();
    } catch (err) {
      if (err.code === 404) {
        return null;
      }
      throw err;
    }
  };
}
