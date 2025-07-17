import { Injectable } from '@angular/core';
import { filter as _filter } from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

@Injectable({
  providedIn: 'root',
})
export class UpdateFacilityService {
  constructor(
    private dbService:DbService,
    private extractLineageService:ExtractLineageService,
    private chtDatasourceService: CHTDatasourceService,
  ) {
  }

  async update(messageId, facilityId) {
    try {
      const datasource = await this.chtDatasourceService.get();
    
      const [message, facility] = await Promise.all([
        this.dbService.get().get(messageId),
        datasource.v1.contact.getByUuid(facilityId)
      ]);

      message.contact = this.extractLineageService.extract(facility);
      if (facility) {
        message.errors = _filter(message.errors, (error) => {
          return error.code !== 'sys.facility_not_found';
        });
      }
      
      return this.dbService.get().put(message);

    } catch (err) {
      console.error('Error updating facility:', err);
      throw err;
    }
  }
}
