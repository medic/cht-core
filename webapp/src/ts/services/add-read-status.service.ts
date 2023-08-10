import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class AddReadStatusService {
  constructor(private dbService: DbService) { }

  private getKeys(type, models: Record<string, any>[] = []) {
    return models.map(model => {
      const id = model.id || model._id;
      return [ 'read', type, id ].join(':');
    });
  }

  private addRead(type, models: Record<string, any>[] = []): Promise<Record<string, any>[]> {
    if (!models.length) {
      return Promise.resolve(models);
    }

    const keys = this.getKeys(type, models);

    return this.dbService
      .get({ meta: true })
      .allDocs({ keys: keys })
      .then((response) => {
        models.forEach((model, i) => {
          const row = response.rows[i];
          model.read = !!(row.value && !row.value.deleted); // doc exists.
        });

        return models;
      });
  }

  /**
   * Update report view models
   * @memberof AddReadStatus
   * @param {Object[]} models The models to mark as read
   * @returns {Promise} A promise to return updated models
   */
  updateReports(models) {
    return this.addRead('report', models);
  }

  /**
   * Update message view models
   * @memberof AddReadStatus
   * @param {Object[]} models The models to mark as read
   * @returns {Promise} A Promise to return updated models
   */
  updateMessages(models) {
    return this.addRead('message', models);
  }
}
