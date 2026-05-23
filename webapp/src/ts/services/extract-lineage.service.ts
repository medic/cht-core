import { Injectable } from '@angular/core';

// Shape-compatible with NormalizedParent from `@medic/cht-datasource/libs/core`
// (`readonly _id: string` + `readonly parent?: NormalizedParent`). Kept local
// because NormalizedParent is marked @internal and not re-exported from the
// cht-datasource public API; converge once the shared type is exposed.
interface ContactLineage {
  readonly _id: string;
  readonly parent?: ContactLineage;
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
    return contact.parent
      ? { _id: contact._id, parent: this.extract(contact.parent) ?? undefined }
      : { _id: contact._id };
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
