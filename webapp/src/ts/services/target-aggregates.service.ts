import { Injectable, NgZone } from '@angular/core';
import * as moment from 'moment';
import { isString as _isString } from 'lodash-es';
import { Person } from '@medic/cht-datasource';

import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { DbService } from '@mm-services/db.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { SearchService } from '@mm-services/search.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { CalendarIntervalService } from '@mm-services/calendar-interval.service';
import { TranslateService } from '@mm-services/translate.service';
import { Target, TargetValue } from '@mm-services/rules-engine.service';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';

@Injectable({
  providedIn: 'root'
})
export class TargetAggregatesService {

  constructor(
    private uhcSettingsService: UHCSettingsService,
    private dbService: DbService,
    private translateService: TranslateService,
    private translateFromService: TranslateFromService,
    private searchService: SearchService,
    private getDataRecordsService: GetDataRecordsService,
    private userSettingsService: UserSettingsService,
    private contactTypesService: ContactTypesService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private calendarIntervalService: CalendarIntervalService,
    private ngZone: NgZone,
  ) { }

  /**
   * Targets reporting intervals cover a calendaristic month, starting on a configurable day (uhcMonthStartDate)
   * Each target doc will use the end date of its reporting interval, in YYYY-MM format, as part of its _id
   * ex: uhcMonthStartDate is 12, current date is 2020-02-03, the <interval_tag> will be 2020-02
   * ex: uhcMonthStartDate is 15, current date is 2020-02-21, the <interval_tag> will be 2020-03
   *
   * @param settings - The application settings containing uhcMonthStartDate
   * @param reportingPeriod - Optional. ReportingPeriod enum value (CURRENT or PREVIOUS)
   * @returns A string representing the interval tag in YYYY-MM format
   *
   * getPrevious fetches the interval tag for the current calendaristic month
   * getCurrent fetches the interval tag for the previous calendaristic month
   */

  private getIntervalTag(settings, reportingPeriod?: ReportingPeriod) {
    const uhcMonthStartDate = this.uhcSettingsService.getMonthStartDate(settings);
    const targetInterval = this.isPreviousPeriod(reportingPeriod)
      ? this.calendarIntervalService.getPrevious(uhcMonthStartDate)
      : this.calendarIntervalService.getCurrent(uhcMonthStartDate);

    return moment(targetInterval.end).format('Y-MM');
  }

  isPreviousPeriod(reportingPeriod) {
    return reportingPeriod === ReportingPeriod.PREVIOUS;
  }

  isCurrentPeriod(reportingPeriod) {
    return reportingPeriod === ReportingPeriod.CURRENT;
  }

  /**
   * Every target doc follows the _id scheme `target~<interval_tag>~<contact_uuid>~<user_id>`
   * In order to retrieve the latest target document(s), we compute the current interval <interval_tag>
   */
  private fetchLatestTargetDocs(settings, reportingPeriod?: ReportingPeriod) {
    const tag = this.getIntervalTag(settings, reportingPeriod);

    const opts = {
      start_key: `target~${tag}~`,
      end_key: `target~${tag}~\ufff0`,
      include_docs: true,
    };

    return this.dbService
      .get()
      .allDocs(opts)
      .then(result => {
        return result &&
          result.rows &&
          result.rows
            .map(row => row.doc)
            .filter(doc => doc);
      });
  }

  private fetchLatestTargetDoc(settings, contactUuid) {
    const tag = this.getIntervalTag(settings);
    const opts = {
      start_key: `target~${tag}~${contactUuid}~`,
      end_key: `target~${tag}~${contactUuid}~\ufff0`,
      include_docs: true
    };

    return this.dbService
      .get()
      .allDocs(opts)
      .then(result => result?.rows?.[0]?.doc);
  }

  private getTargetsConfig(settings, aggregatesOnly = false) {
    return settings?.tasks?.targets?.items?.filter(target => aggregatesOnly ? target.aggregate : true) || [];
  }

  private calculatePercent(value) {
    return (value && value.total) ? Math.round(value.pass * 100 / value.total) : 0;
  }

  private getTranslatedTitle(target) {
    if (target.translation_key) {
      return this.translateService.instant(target.translation_key);
    }

    return this.translateFromService.get(target.title);
  }

  private getAggregate(originalTargetConfig) {
    const targetConfig = { ...originalTargetConfig };

    targetConfig.values = [];
    targetConfig.hasGoal = targetConfig.goal > 0;
    targetConfig.isPercent = targetConfig.type === 'percent';
    targetConfig.progressBar = targetConfig.hasGoal || targetConfig.isPercent;
    targetConfig.heading = this.getTranslatedTitle(targetConfig);
    targetConfig.aggregateValue = { pass: 0, total: 0 };

    return targetConfig;
  }

  private getRelevantTargetDocs(targetDocs, contacts) {
    return contacts.map(contact => {
      let targetDoc = targetDocs.find(doc => doc.owner === contact._id);

      if (!targetDoc) {
        targetDoc = {
          owner: contact._id,
          targets: []
        };
      }

      targetDoc.contact = contact;
      return targetDoc;
    });
  }

  private addAggregatesValues(aggregate, targetDoc) {
    const targetValue = targetDoc.targets?.find(target => target.id === aggregate.id);
    const value = targetValue && targetValue.value || { total: 0, pass: 0, placeholder: true };

    value.percent = aggregate.isPercent ?
      this.calculatePercent(value) : this.calculatePercent({ total: aggregate.goal, pass: value.pass });

    if (!aggregate.hasGoal) {
      aggregate.aggregateValue.pass += value.pass;
      aggregate.aggregateValue.total += value.total;
    } else {
      value.goalMet = (aggregate.isPercent ? value.percent : value.pass) >= aggregate.goal;

      if (value.goalMet) {
        aggregate.aggregateValue.pass += 1;
      }
    }

    aggregate.values.push({
      contact: targetDoc.contact,
      value: value
    });
  }

  private calculatePercentages(aggregate, total) {
    if (!aggregate.hasGoal && aggregate.isPercent) {
      aggregate.aggregateValue.percent = this.calculatePercent(aggregate.aggregateValue);
    }

    if (aggregate.hasGoal) {
      aggregate.aggregateValue.total = total;
      aggregate.aggregateValue.goalMet = aggregate.aggregateValue.pass >= aggregate.aggregateValue.total;
    }

    aggregate.aggregateValue.hasGoal = aggregate.hasGoal;

    if (aggregate.hasGoal) {
      const translationKey = 'analytics.target.aggregates.ratio';
      aggregate.aggregateValue.summary = this.translateService.instant(translationKey, aggregate.aggregateValue);
    } else {
      aggregate.aggregateValue.summary = aggregate.isPercent ?
        `${aggregate.aggregateValue.percent}%` : aggregate.aggregateValue.pass;
    }
  }

  private aggregateTargets(latestTargetDocs, contacts, targetsConfig) {
    const relevantTargetDocs = this.getRelevantTargetDocs(latestTargetDocs, contacts);
    const aggregates = targetsConfig.map((targetConfig) => this.getAggregate(targetConfig));

    relevantTargetDocs.forEach(targetDoc => {
      aggregates.forEach(aggregate => {
        this.addAggregatesValues(aggregate, targetDoc);
      });
    });

    aggregates.forEach(aggregate => this.calculatePercentages(aggregate, relevantTargetDocs.length));

    return aggregates;
  }

  private getTargetDetails(targetDoc, settings) {
    if (!targetDoc) {
      return;
    }

    const targetsConfig = this.getTargetsConfig(settings);
    targetDoc.targets.forEach(targetValue => {
      const targetConfig = targetsConfig.find(item => item.id === targetValue.id);
      Object.assign(targetValue, targetConfig);
    });

    return targetDoc;
  }

  private searchForContacts(homePlaceSummary, filters, skip = 0, contacts: any[] = []) {
    const limit = 100;

    return this.searchService
      .search('contacts', filters, { limit, skip })
      .then(results => {
        const contactIds = results
          .filter(place => place.lineage && place.lineage[0] === homePlaceSummary._id && place.contact)
          .map(place => place.contact);

        return this.getDataRecordsService
          .get(contactIds)
          .then(newContacts => {
            contacts.push(...newContacts);

            if (results.length < limit) {
              return contacts;
            }

            return this.searchForContacts(homePlaceSummary, filters, skip + limit, contacts);
          });
      });
  }

  private async getUserFacilityIds(): Promise<string[] | undefined> {
    const { facility_id }: any = await this.userSettingsService.get();
    if (!facility_id?.length) {
      return;
    }
    return Array.isArray(facility_id) ? facility_id : [facility_id];
  }

  private async getHomePlace(facilityId?) {
    if (facilityId) {
      const places = await this.getDataRecordsService.get([facilityId]);
      return places?.[0];
    }

    const facilityIds = await this.getUserFacilityIds();
    if (!facilityIds?.length) {
      return;
    }
    const places = await this.getDataRecordsService.get(facilityIds);
    return places?.[0];
  }

  private getSupervisedContacts(facilityId?) {
    const alphabeticalSort = (a, b) => String(a.name).localeCompare(String(b.name));

    return this
      .getHomePlace(facilityId)
      .then(homePlaceSummary => {
        if (!homePlaceSummary) {
          const message = 'Your user does not have an associated contact, or does not have access to the ' +
            'associated contact.';
          const err: any = new Error(message);
          err.translationKey = 'analytics.target.aggregates.error.no.contact';
          throw err;
        }

        const homePlaceType = this.contactTypesService.getTypeId(homePlaceSummary);
        return this.contactTypesService
          .getChildren(homePlaceType)
          .then(childTypes => {
            childTypes = childTypes.filter(type => !this.contactTypesService.isPersonType(type));

            if (!childTypes.length) {
              return [];
            }

            const filters = { types: { selected: childTypes.map(type => type.id) } };
            return this.searchForContacts(homePlaceSummary, filters);
          })
          .then(contacts => contacts.sort(alphabeticalSort));
      });
  }

  async isEnabled() {
    const canSeeAggregates = await this.authService.has('can_aggregate_targets');
    if (!canSeeAggregates) {
      return false;
    }

    const facilityIds = await this.getUserFacilityIds();

    // When no facilities assigned, this returns true to display an error indicating to assign facilities to the user
    return !facilityIds || facilityIds.length > 0;
  }

  getReportingMonth(reportingPeriod) {
    return this.settingsService
      .get()
      .then(settings => {
        const tag = this.getIntervalTag(settings, reportingPeriod);
        return moment(tag, 'YYYY-MM').format('MMMM');
      })
      .catch(error => {
        console.error('Error getting reporting month:', error);
        return this.translateService.instant('targets.last_month.subtitle');
      });
  }

  getAggregates(facilityId?, reportingPeriod?: ReportingPeriod) {
    return this.ngZone.runOutsideAngular(() => this._getAggregates(facilityId, reportingPeriod));
  }

  private _getAggregates(facilityId?, reportingPeriod?: ReportingPeriod): Promise<AggregateTarget[]> {
    return this.settingsService
      .get()
      .then(settings => {
        const targetsConfig = this.getTargetsConfig(settings, true);

        if (!targetsConfig.length) {
          return [];
        }

        return Promise
          .all([
            this.getSupervisedContacts(facilityId),
            this.fetchLatestTargetDocs(settings, reportingPeriod)
          ])
          .then(([contacts, latestTargetDocs]) => this.aggregateTargets(latestTargetDocs, contacts, targetsConfig));
      });
  }

  getAggregateDetails(targetId?, aggregates?) {
    if (!targetId || !aggregates) {
      return;
    }

    return aggregates.find(aggregate => aggregate.id === targetId);
  }

  getCurrentTargetDoc(contact?) {
    return this.ngZone.runOutsideAngular(() => this._getCurrentTargetDoc(contact));
  }

  private _getCurrentTargetDoc(contact?) {
    if (!contact) {
      return Promise.resolve();
    }

    const contactUuid = _isString(contact) ? contact : contact._id;

    if (!contactUuid) {
      return Promise.resolve();
    }

    return this.settingsService
      .get()
      .then(settings => {
        return this
          .fetchLatestTargetDoc(settings, contactUuid)
          .then(targetDoc => this.getTargetDetails(targetDoc, settings));
      });
  }

}

export interface AggregateTarget extends Target {
  aggregate: boolean;
  hasGoal: boolean;
  isPercent: boolean;
  progressBar: boolean;
  facility?: string;
  reportingPeriod?: ReportingPeriod;
  reportingMonth?: string;
  filtersToDisplay?: (string | ReportingPeriod)[];
  heading: string;
  values: ContactTargetValue[];
  aggregateValue: AggregateTargetValue;
  dhis?: {
    dataElement?: string;
    categoryOptionCombo?: string;
    attributeOptionCombo?: string;
  };
}

export interface AggregateTargetValue extends TargetValue {
  hasGoal: boolean;
  summary: string;
}

export interface ContactTargetValue {
  value: TargetValue;
  contact: Person.v1.Person;
}
