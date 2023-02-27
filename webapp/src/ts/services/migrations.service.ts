import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { TargetCheckpointerMigration } from '@mm-services/migrations/target-checkpointer.migration';

@Injectable({
  providedIn: 'root'
})
export class MigrationsService {
  constructor(
    private dbService:DbService,
    private targetCheckpointerMigration:TargetCheckpointerMigration,
  ) {
  }

  private getMigrations() {
    return [
      this.targetCheckpointerMigration,
    ];
  }

  async runMigrations () {
    for (const migration of this.getMigrations()) {
      if (await migration.hasRun()) {
        continue;
      }

      await migration.run();
    }
  }
}
