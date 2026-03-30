import { Injectable } from '@angular/core';
import { DOC_IDS } from '@medic/constants';

import { DbService } from '@admin-tool-services/db.service';
import { ChangesService } from '@admin-tool-services/changes.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly SETTINGS_ID = DOC_IDS.SETTINGS;
  private cachedSettings: Promise<Record<string, any>> | null = null;

  constructor(private db: DbService, private changesService: ChangesService) {
    this.changesService.subscribe({
      key: 'settings',
      filter: (change) => change.id === this.SETTINGS_ID,
      callback: () => {
        this.cachedSettings = null;
      },
    });
  }

  get(): Promise<Record<string, any>> {
    if (!this.cachedSettings) {
      this.cachedSettings = this.db
        .get()
        .get(this.SETTINGS_ID)
        .then((doc: any) => doc.settings)
        .catch((err) => {
          this.cachedSettings = null;
          return Promise.reject(err);
        });
    }
    return this.cachedSettings!;
  }
}
