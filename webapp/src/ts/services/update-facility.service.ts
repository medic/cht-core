import { Injectable } from '@angular/core';
import { filter as _filter } from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';

@Injectable({
  providedIn: 'root',
})
export class UpdateFacilityService {
  constructor(
    private dbService:DbService,
    private extractLineageService:ExtractLineageService,
  ) {
  }

  update(messageId, facilityId) {
    return Promise
      .all([
        this.dbService.get().get(messageId),
        this.dbService.get().get(facilityId),
      ])
      .then(([message, facility]) => {
        message.contact = this.extractLineageService.extract(facility);
        if (facility) {
          message.errors = _filter(message.errors, (error) => {
            return error.code !== 'sys.facility_not_found';
          });
        }
        return message;
      })
      .then((message) => {
        return this.dbService.get().put(message);
      });
  }
}
