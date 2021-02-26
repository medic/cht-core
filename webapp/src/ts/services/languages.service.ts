import { Injectable } from '@angular/core';
import { map } from 'lodash-es';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class LanguagesService {
  constructor(
    private dbService:DbService,
  ){}

  get(): Promise<Object> {
    return this.dbService.get()
      .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
      .then((result) => {
        return map(result.rows, 'value');
      });
  }
}
