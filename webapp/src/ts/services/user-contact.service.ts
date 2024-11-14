import { Injectable } from '@angular/core';
import { Person, Qualifier } from '@medic/cht-datasource';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { AuthService } from '@mm-services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserContactService {
  private readonly getPerson: ReturnType<typeof Person.v1.get>;
  private readonly getPersonWithLineage: ReturnType<typeof Person.v1.getWithLineage>;
  constructor(
    private userSettingsService: UserSettingsService,
    private authService: AuthService,
    chtDatasourceService: CHTDatasourceService,
  ) {
    this.getPerson = chtDatasourceService.bind(Person.v1.get);
    this.getPersonWithLineage = chtDatasourceService.bind(Person.v1.getWithLineage);
  }

  async get({ hydrateLineage = true } = {}) {
    const user: any = await this.getUserSettings();
    if (!user?.contact_id) {
      return null;
    }
    const getPerson = hydrateLineage ? this.getPersonWithLineage : this.getPerson;
    return getPerson(Qualifier.byUuid(user.contact_id));
  }

  async getUserLineageToRemove(): Promise<string | null> {
    if (this.authService.online(true)) {
      return null;
    }

    const { facility_id }:any = await this.getUserSettings();
    if (!facility_id || (Array.isArray(facility_id) && facility_id.length > 1)) {
      return null;
    }

    const user = await this.get();
    return user?.parent?.name as string;
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
