import { Injectable } from '@angular/core';
import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { Contact } from '@medic/cht-datasource';

const DEFAULT_CONTACT_DUPLICATE_EXPRESSION =
  'levenshteinEq(current.name, existing.name, 3) && ' +
  'ageInYears(current) === ageInYears(existing)';
export type DuplicateCheck = { expression?: string; disabled?: boolean };
@Injectable({
  providedIn: 'root'
})
export class DeduplicateService {
  constructor(
    private readonly parseProvider: ParseProvider,
    private readonly xmlFormsContextUtilsService: XmlFormsContextUtilsService,
  ) { }

  private extractExpression(duplicateCheck?: DuplicateCheck) {
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
    doc: Contact.v1.Contact,
    siblings: Array<Contact.v1.Contact>,
    duplicateCheck?: DuplicateCheck
  ) {
    // Remove the currently edited doc from the sibling list
    const _siblings: Contact.v1.Contact[] = siblings.filter(({ _id }) => _id !== doc._id);

    const parsed = this.parseProvider.parse(this.extractExpression(duplicateCheck));
    return _siblings.filter((sibling) => {
      return parsed(this.xmlFormsContextUtilsService, {
        current: doc,
        existing: sibling,
      });
    }).sort((a: Contact.v1.Contact, b: Contact.v1.Contact) => {
      // Desc order - reverse order by switching props
      return new Date(b.reported_date || 0).getTime() - new Date(a.reported_date || 0).getTime();
    });
  }
}
