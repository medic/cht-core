import { Injectable } from '@angular/core';
import { DbService } from '@mm-services/db.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';

export type Doc = { _id: string; name: string; reported_date: number;[key: string]: any };
const DEFAULT_CONTACT_DUPLICATE_EXPRESSION =
  'levenshteinEq(current.name, existing.name, 3) && ' +
  'ageInYears(current.date_of_birth) === ageInYears(existing.date_of_birth)';
export type DuplicateCheck = { expression?: string; disabled?: boolean };
@Injectable({
  providedIn: 'root'
})
export class DeduplicateService {
  constructor(
    private readonly dbService: DbService,
    private readonly parseProvider: ParseProvider,
    private readonly xmlFormsContextUtilsService: XmlFormsContextUtilsService,
  ) { }

  async requestSiblings(parentId: string, contactType: string) {
    const siblings: Doc[] = [];
    // Generally, Only reason why we won't have a "parent_id" is if we're creating/editing a top-level place.
    const results = contactType && (parentId ? await this.dbService.get().query('medic-client/contacts_by_parent', {
      startkey: [parentId, contactType],
      endkey: [parentId, contactType, {}],
      include_docs: true
    }) : await this.dbService.get().query('medic-client/contacts_by_type', {
      startkey: [contactType],
      endkey: [contactType, {}],
      include_docs: true
    }));
    if (results) {
      siblings.push(...results.rows.map((row: { doc: Doc }) => row.doc));
    }
    return siblings;
  }

  extractExpression(duplicateCheck?: DuplicateCheck) {
    if (duplicateCheck) {
      if (duplicateCheck.disabled === true) {
        return null; // No duplicate check should be performed
      } else if (typeof duplicateCheck.expression === 'string') {
        return duplicateCheck.expression;
      }
    }

    return DEFAULT_CONTACT_DUPLICATE_EXPRESSION;
  }

  getDuplicates(
    doc: Doc,
    siblings: Array<Doc>,
    expression: string
  ) {
    const _siblings: Doc[] = siblings.filter(({ _id }) => _id !== doc._id);
    // Remove the currently edited doc from the sibling list
  
    return _siblings.filter((sibling) => {
      const parsed = this.parseProvider.parse(expression);
      return parsed(this.xmlFormsContextUtilsService, {
        current: doc,
        existing: sibling,
      });
    }).sort((a: Doc, b: Doc) => (b.reported_date || 0) - (a.reported_date || 0));
    // Desc order - reverse order by switching props
  }
}
