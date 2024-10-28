import { Injectable } from '@angular/core';

import { TelemetryService } from '@mm-services/telemetry.service';

@Injectable({
  providedIn: 'root'
})
export class SearchTelemetryService {
  private readonly CONTACT_SKIPPED_PROPERTIES = ['_id', '_rev', 'type', 'refid', 'geolocation'];
  private readonly REPORT_SKIPPED_PROPERTIES = ['_id', '_rev', 'type', 'refid', 'content'];

  constructor(
    private readonly telemetryService: TelemetryService,
  ) {}

  public async recordContactSearch(contactDoc: Record<string, any>, search: string) {
    const matchingProperties = await this.findMatchingProperties(contactDoc, search, this.CONTACT_SKIPPED_PROPERTIES);

    for (const key of matchingProperties) {
      await this.telemetryService.record(`search_match:contacts_by_freetext:${key}`);
    }
  }

  public async recordContactByTypeSearch(contactDoc: Record<string, any>, search: string) {
    const matchingProperties = await this.findMatchingProperties(contactDoc, search, this.CONTACT_SKIPPED_PROPERTIES);

    for (const key of matchingProperties) {
      await this.telemetryService.record(`search_match:contacts_by_type_freetext:${key}`);
    }
  }

  public async recordReportSearch(reportDoc: Record<string, any>, search: string) {
    const [matches, fieldsMatches] = await Promise.all([
      this.findMatchingProperties(reportDoc, search, this.REPORT_SKIPPED_PROPERTIES),
      this.findMatchingProperties(reportDoc.fields, search, this.REPORT_SKIPPED_PROPERTIES, 'fields'),
    ]);
    const matchingProperties = new Set(...matches, ...fieldsMatches);

    for (const key of matchingProperties) {
      await this.telemetryService.record(`search_match:reports_by_freetext:${key}`);
    }
  }

  private async findMatchingProperties(
    doc: Record<string, any>,
    search: string,
    skip: string[],
    basePropertyPath = '',
  ) {
    const matchingProperties = new Set<string>();
    const colonSearch = search.split(':');
    if (colonSearch.length > 1) {
      return [`${colonSearch[0]}:$value`];
    }

    const _search = search.toLowerCase();
    Object.entries(doc).forEach(([key, value]) => {
      const _key = key.toLowerCase();
      if (skip.includes(_key) || _key.endsWith('_date')) {
        return;
      }

      const propertyPath = basePropertyPath ? `${basePropertyPath}.${key}` : key;
      if (typeof value === 'string' && value.toLowerCase().includes(_search)) {
        matchingProperties.add(propertyPath);
      }
    });

    return Array.from(matchingProperties);
  }
}
