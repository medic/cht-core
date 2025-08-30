import { Injectable } from '@angular/core';
import { filter as _filter } from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { Contact, Qualifier } from '@medic/cht-datasource';

@Injectable({
  providedIn: 'root',
})
export class UpdateFacilityService {
  constructor(
    private dbService:DbService,
    private extractLineageService:ExtractLineageService,
    readonly chtDatasourceService: CHTDatasourceService,
  ) {
    this.getContactFromDatasource = chtDatasourceService.bind(Contact.v1.get);
  }

  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;
  
  async update(messageId, facilityId) {
    
    const [message, facility] = await Promise.all([
      this.dbService.get().get(messageId),
      this.getContactFromDatasource(Qualifier.byUuid(facilityId))
    ]);

    message.contact = this.extractLineageService.extract(facility);
    if (facility) {
      message.errors = _filter(message.errors, (error) => {
        return error.code !== 'sys.facility_not_found';
      });
    }
      
    return this.dbService.get().put(message);

    
  }
}
