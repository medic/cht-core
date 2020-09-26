import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReadDocsProvider {

  constructor() { }

  getId(doc) {
    const type = doc.form ? 'report' : 'message';
    return [ 'read', type, doc._id ].join(':');
  }
}
