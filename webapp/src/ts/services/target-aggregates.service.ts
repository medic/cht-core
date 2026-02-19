import { Injectable, NgZone } from '@angular/core';
import { Person, Qualifier, Target } from '@medic/cht-datasource';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { SearchService } from '@mm-services/search.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { TranslateService } from '@mm-services/translate.service';
import { RulesEngineService, TargetViewModel, TargetValue } from '@mm-services/rules-engine.service';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-sidebar-filter.component';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

const { byContactUuids, byContactUuid, byReportingPeriod } = Qualifier;

@Injectable({
  providedIn: 'root'
})
export class TargetAggregatesService {

  constructor(
    chtDatasourceService: CHTDatasourceService,
    private readonly translateService:TranslateService,
    private readonly translateFromService:TranslateFromService,
    private readonly searchService:SearchService,
    private readonly getDataRecordsService:GetDataRecordsService,
    private readonly userSettingsService:UserSettingsService,
    private readonly contactTypesService:ContactTypesService,
    private readonly authService:AuthService,
    private readonly settingsService:SettingsService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly ngZone:NgZone,
  ) {
    this.getTargets = chtDatasourceService.bindGenerator(Target.v1.getAll);
  }

  private readonly MAX_TARGET_MONTHS = 3;
  private readonly getTargets: ReturnType<typeof Target.v1.getAll>;

  private async fetchTargetDocsForInterval(contactUuid, intervalTag) {
    const results: Target.v1.Target[] = [];
    const qualifier = Qualifier.and(byContactUuid(contactUuid), byReportingPeriod(intervalTag));
    for await (const targetInt of this.getTargets(qualifier)) {
      results.push(targetInt);
    }
    return results;
  }

  private async fetchTargetDocs(appSettings, contactUuid) {
    const allTargetDocs: unknown[] = [];
    for (let monthsOld = 0; monthsOld < this.MAX_TARGET_MONTHS; monthsOld++) {
      const intervalTag = this.rulesEngineService.getTargetIntervalTag(
        appSettings,
        ReportingPeriod.PREVIOUS,
        monthsOld,
      );
      const intervalTargetDocs = await this.fetchTargetDocsForInterval(contactUuid, intervalTag);
      allTargetDocs.push(...intervalTargetDocs);
    }
    return allTargetDocs;
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

  private getAggregate(originalTargetConfig, reportingMonth: string) {
    const hasGoal = originalTargetConfig.goal > 0;
    const isPercent = originalTargetConfig.type === 'percent';
    return {
      ...originalTargetConfig,
      values: [],
      hasGoal,
      isPercent,
      progressBar: hasGoal || isPercent,
      heading: this.getTranslatedTitle(originalTargetConfig),
      reportingMonth,
      aggregateValue: { pass: 0, total: 0 },
    };
  }

  private async getRelevantTargetDocs(intervalTag: string, contacts) {
    if (!contacts.length) {
      return [];
    }
    const qualifier = Qualifier.and(
      byReportingPeriod(intervalTag),
      byContactUuids(contacts.map(({ _id }) => _id))
    );
    const targetDocs: Target.v1.Target[] = [];
    for await (const targetInt of this.getTargets(qualifier)) {
      targetDocs.push(targetInt);
    }

    return contacts.map(contact => {
      const targetDoc = targetDocs.find(({ owner }) => owner === contact._id);
      return {
        ...targetDoc ?? { owner: contact._id, targets: [] },
        contact
      };
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

  private async aggregateTargets(intervalTag: string, contacts, aggregates) {
    const relevantTargetDocs = await this.getRelevantTargetDocs(intervalTag, contacts);

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
    const userFacilities = await this.userSettingsService.getUserFacilities();
    if (!userFacilities?.length) {
      return;
    }
    return userFacilities.map(facility => facility._id);
  }

  private async getHomePlace(facilityId?) {
    if (facilityId) {
      const places = await this.getDataRecordsService.get([ facilityId ]);
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
          const err:any = new Error(message);
          err.translationKey = 'analytics.target.aggregates.error.no.contact';
          throw err;
        }

        const homePlaceType = this.contactTypesService.getTypeId(homePlaceSummary);
        return this.contactTypesService
          .getPlaceChildTypes(homePlaceType)
          .then(childTypes => {
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

  getAggregates(facilityId?, reportingPeriod = ReportingPeriod.CURRENT) {
    return this.ngZone.runOutsideAngular(() => this._getAggregates(facilityId, reportingPeriod));
  }

  private async _getAggregates(facilityId, reportingPeriod: ReportingPeriod): Promise<AggregateTarget[]> {
    const settings = await this.settingsService.get();
    const targetsConfig = this.getTargetsConfig(settings, true);

    if (!targetsConfig.length) {
      return [];
    }

    const reportingMonth = this.rulesEngineService.getReportingMonth(settings, reportingPeriod);
    const configAggregates = targetsConfig.map((targetConfig) => this.getAggregate(targetConfig, reportingMonth));
    const contacts = await this.getSupervisedContacts(facilityId);
    const intervalTag = this.rulesEngineService.getTargetIntervalTag(settings, reportingPeriod);
    return this.aggregateTargets(intervalTag, contacts, configAggregates);
  }

  getAggregateDetails(targetId?, aggregates?) {
    if (!targetId || !aggregates) {
      return;
    }

    return aggregates.find(aggregate => aggregate.id === targetId);
  }

  getTargetDocs(contact, userFacilityIds:string[]|undefined, userContactId:string|undefined):Promise<any[]> {
    return this.ngZone.runOutsideAngular(() => this._getTargetDocs(contact, userFacilityIds, userContactId));
  }

  private async _getTargetDocs(
    contact,
    userFacilityIds:string[]|undefined,
    userContactId:string|undefined
  ):Promise<any[]> {
    const contactUuid = contact?._id;
    if (!contactUuid) {
      return [];
    }

    const isUserFacility = userFacilityIds?.includes(contactUuid);
    const shouldLoadTargetDocs = isUserFacility || await this.contactTypesService.isPerson(contact);
    if (!shouldLoadTargetDocs) {
      return [];
    }

    const targetContact = isUserFacility ? userContactId : contactUuid;
    const settings = await this.settingsService.get();
    const targetDocs = await this.fetchTargetDocs(settings, targetContact);
    return targetDocs.map(targetDoc => this.getTargetDetails(targetDoc, settings));
  }
}

export interface AggregateTarget extends TargetViewModel {
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
