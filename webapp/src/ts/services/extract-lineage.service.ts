import { Injectable } from '@angular/core';

interface ContactLineage {
  _id?: string;
  parent?: ContactLineage;
}

@Injectable({
  providedIn: 'root'
})
export class ExtractLineageService {

  constructor() {
  }

  extract(contact: ContactLineage | null | undefined): ContactLineage | null | undefined {
    if (!contact) {
      return contact;
    }

    const result: ContactLineage = { _id: contact._id };
    let minified = result;

    while (contact.parent) {
      const next: ContactLineage = { _id: contact.parent._id };
      minified.parent = next;
      minified = next;
      contact = contact.parent;
    }

    return result;
  }

  removeUserFacility(lineage: string[], userLineageLevel: string): string[] | undefined {
    if (!lineage?.length) {
      return;
    }

    lineage = lineage.filter(level => level);
    if (!userLineageLevel) {
      return lineage;
    }

    if (lineage[lineage.length - 1] === userLineageLevel) {
      lineage.pop();
    }

    return lineage;
  }
}
