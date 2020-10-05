import { Injectable } from '@angular/core';
import { find as _find } from 'lodash-es'

@Injectable({
  providedIn: 'root'
})
export class ContactMutedService {

  constructor() { }

  getMuted(doc, lineage?) {
    if (!doc) {
      return false;
    }

    if (doc.muted) {
      return doc.muted;
    }

    if (lineage) {
      const mutedParent = _find(lineage, (parent) => parent && parent.muted);

      return !!mutedParent && mutedParent.muted;
    }

    let parent = doc.parent;
    while (parent) {
      if (parent.muted) {
        return parent.muted;
      }
      parent = parent.parent;
    }

    return false;
  }
}
