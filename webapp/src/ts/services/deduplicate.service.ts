import { Injectable } from '@angular/core';
import { ParseProvider } from '@mm-providers/parse.provider';
import { XmlFormsContextUtilsService } from '@mm-services/xml-forms-context-utils.service';
import { Contact } from '@medic/cht-datasource';
import { TelemetryService } from '@mm-services/telemetry.service';

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
    private readonly telemetryService: TelemetryService,
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
    current: Contact.v1.Contact,
    contactType: string,
    siblings: Array<Contact.v1.Contact>,
    duplicateCheck?: DuplicateCheck
  ) {
    // Remove the currently edited doc from the sibling list
    const _siblings: Contact.v1.Contact[] = siblings.filter(({ _id }) => _id !== current._id);

    const parsed = this.parseProvider.parse(this.extractExpression(duplicateCheck));
    const duplicates = _siblings
      .filter((existing) => parsed(this.xmlFormsContextUtilsService, { current, existing }))
      .sort((a: Contact.v1.Contact, b: Contact.v1.Contact) => {
        // Desc order - reverse order by switching props
        return new Date(b.reported_date ?? 0).getTime() - new Date(a.reported_date ?? 0).getTime();
      });

    this.telemetryService.record(
      ['enketo', 'contacts', contactType, 'duplicates_found'].join(':'),
      duplicates.length
    );

    return duplicates;
  }
}
