import {Inject, Injectable} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  dbName = 'medic';
  path = '/';
  adminPath = '/admin/';

  url;

  constructor(@Inject(DOCUMENT) private document: Document) {
    const location = document.location;
    const port = location.port ? ':' + location.port : '';
    this.url = location.protocol + '//' + location.hostname + port + '/' + this.dbName;
  }
}
