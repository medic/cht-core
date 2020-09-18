import {Injectable} from '@angular/core';
import { DbService } from './db.service';

const _ = require('lodash/core');

@Injectable({
  providedIn: 'root'
})
export class LanguagesService {
  constructor(
    private dbService:DbService,
  ){}

  get() {
    return this.dbService.get()
      .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
      .then(function(result) {
        return _.map(result.rows, 'value');
      });
  }
}