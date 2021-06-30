import { Injectable } from '@angular/core';
import { find as _find } from 'lodash-es';

@Injectable({
  providedIn: 'root'
})
export class ContactMutedService {

  constructor() { }

  getMutedDoc(doc, lineage?) {
    if (!doc) {
      return false;
    }

    if (doc.muted) {
      return doc;
    }

    if (lineage) {
      return _find(lineage, (parent) => parent?.muted);
    }

    let parent = doc.parent;
    while (parent) {
      if (parent.muted) {
        return parent;
      }
      parent = parent.parent;
    }

    return false;
  }

  getMuted(doc, lineage?) {
    return this.getMutedDoc(doc, lineage)?.muted || false;
  }
}
