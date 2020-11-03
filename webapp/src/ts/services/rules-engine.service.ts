import { Injectable, OnDestroy } from '@angular/core';
import * as RegistrationUtils from '@medic/registration-utils';
import * as RulesEngineCore from '@medic/rules-engine';
import * as CalendarInterval from '@medic/calendar-interval';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';

import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { ChangesService } from '@mm-services/changes.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TranslateFromService } from '@mm-services/translate-from.service';

const MAX_LINEAGE_DEPTH = 50;
const ENSURE_FRESHNESS_SECS = 120;

@Injectable({
  providedIn: 'root'
})
export class RulesEngineService implements OnDestroy {
  subscriptions: Subscription = new Subscription();
  initialized;
  uhcMonthStartDate;
  ensureTaskFreshness;
  ensureTargetFreshness;
  ensureTaskFreshnessTelemetryData;
  ensureTargetFreshnessTelemetryData;

  constructor(
    private translateService: TranslateService,
    private authService: AuthService,
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private telemetryService: TelemetryService,
    private uhcSettingsService: UHCSettingsService,
    private userContactService: UserContactService,
    private userSettingsService: UserSettingsService,
    private parseProvider: ParseProvider,
    private changesService: ChangesService,
    private contactTypesService: ContactTypesService,
    private translateFromService: TranslateFromService
  ) {
    this.initialized = this.initialize();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initialize() {
    return Promise
      .all([
        this.authService.has('can_view_tasks'),
        this.authService.has('can_view_analytics')
      ])
      .then(([canViewTasks, canViewTargets]) => {
        const hasPermission = canViewTargets || canViewTasks;
        if (!hasPermission || this.sessionService.isOnlineOnly()) {
          return false;
        }

        return Promise
          .all([
            this.settingsService.get(),
            this.userContactService.get(),
            this.userSettingsService.get()
          ])
          .then(([settingsDoc, userContactDoc, userSettingsDoc]) => {
            const rulesSettings = this.getRulesSettings(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);
            const initializeTelemetryData = this.telemetryEntry('rules-engine:initialize', true);

            return RulesEngineCore
              .initialize(rulesSettings)
              .then(() => {
                const isEnabled = RulesEngineCore.isEnabled();

                if (isEnabled) {
                  this.assignMonthStartDate(settingsDoc);
                  this.monitorChanges(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);

                  this.ensureTaskFreshness = _debounce(this.fetchTaskDocsForAllContacts, ENSURE_FRESHNESS_SECS * 1000);
                  this.ensureTaskFreshness();
                  this.ensureTaskFreshnessTelemetryData = this.telemetryEntry('rules-engine:ensureTaskFreshness:cancel', true);

                  this.ensureTargetFreshness = _debounce(this.fetchTargets, ENSURE_FRESHNESS_SECS * 1000);
                  this.ensureTargetFreshness();
                  this.ensureTargetFreshnessTelemetryData = this.telemetryEntry('rules-engine:ensureTargetFreshness:cancel', true);
                }

                initializeTelemetryData.record();
              });
          });
      })
  }

  private telemetryEntry(entry, startNow = false) {
    const data: any = { entry };
    const queued = () => data.queued = Date.now();

    const start = () => {
      data.start = Date.now();
      data.queued && this.telemetryService.record(`${data.entry}:queued`, data.start - data.queued);
    };

    const record = () => {
      data.start = data.start || Date.now();
      data.end = Date.now();
      this.telemetryService.record(data.entry, data.end - data.start);
    };

    const passThrough = (result) => {
      record();
      return result;
    }

    if (startNow) {
      start();
    }

    return {
      start,
      queued,
      record,
      passThrough,
    };
  }

  private cancelDebounce(debounce, telemetryDataEntry) {
    if (debounce) {
      if (!debounce.executed() && !debounce.cancelled()) {
        telemetryDataEntry.record();
      }
      debounce.cancel();
    }
  }

  private getRulesSettings(settingsDoc, userContactDoc, userSettingsDoc, enableTasks, enableTargets) {
    const settingsTasks = settingsDoc && settingsDoc.tasks || {};
    const filterTargetByContext = (target) => target.context ? !!this.parseProvider.parse(target.context)({ user: userContactDoc }) : true;
    const targets = settingsTasks.targets && settingsTasks.targets.items || [];

    return {
      rules: settingsTasks.rules,
      taskSchedules: settingsTasks.schedules,
      targets: targets.filter(filterTargetByContext),
      enableTasks,
      enableTargets,
      contact: userContactDoc,
      user: userSettingsDoc,
      monthStartDate: this.uhcSettingsService.getMonthStartDate(settingsDoc),
    };
  }

  private monitorChanges(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets) {
    const isReport = doc => doc.type === 'data_record' && !!doc.form;

    const dirtyContactsSubscription = this.changesService.subscribe({
      key: 'mark-contacts-dirty',
      filter: change => !!change.doc && (this.contactTypesService.includes(change.doc) || isReport(change.doc)),
      callback: change => {
        const subjectIds = isReport(change.doc) ? RegistrationUtils.getSubjectId(change.doc) : change.id;
        const telemetryData = this.telemetryEntry('rules-engine:update-emissions', true);

        return RulesEngineCore
          .updateEmissionsFor(subjectIds)
          .then(telemetryData.passThrough);
      }
    });
    this.subscriptions.add(dirtyContactsSubscription);

    const userLineage = [];
    for (let current = userContactDoc; !!current && userLineage.length < MAX_LINEAGE_DEPTH; current = current.parent) {
      userLineage.push(current._id);
    }

    const rulesUpdateSubscription = this.changesService.subscribe({
      key: 'rules-config-update',
      filter: change => change.id === 'settings' || userLineage.includes(change.id),
      callback: change => {
        if (change.id !== 'settings') {
          return this.userContactService
            .get()
            .then(updatedUser => {
              userContactDoc = updatedUser;
              this.rulesConfigChange(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);
            });
        }

        settingsDoc = change.doc.settings;
        this.rulesConfigChange(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);
      },
    });
    this.subscriptions.add(rulesUpdateSubscription);
  }

  private rulesConfigChange(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets) {
    const rulesSettings = this.getRulesSettings(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);
    RulesEngineCore.rulesConfigChange(rulesSettings);
    this.assignMonthStartDate(settingsDoc);
  }

  private translateProperty(property, task) {
    if (typeof property === 'string') {
      // new translation key style
      return this.translateService.instant(property, task);
    }
    // old message array style
    return this.translateFromService.get(property, task);
  }

  private translateTaskDocs(taskDocs = []) {
    taskDocs.forEach(taskDoc => {
      const { emission } = taskDoc;

      if (emission) {
        emission.title = this.translateProperty(emission.title, emission);
        emission.priorityLabel = this.translateProperty(emission.priorityLabel, emission);
      }
    });

    return taskDocs;
  }

  private assignMonthStartDate(settingsDoc) {
    this.uhcMonthStartDate = this.uhcSettingsService.getMonthStartDate(settingsDoc);
  }

  isEnabled() {
    return this.initialized.then(RulesEngineCore.isEnabled);
  }

  fetchTaskDocsForAllContacts() {
    const telemetryData = this.telemetryEntry('rules-engine:tasks:all-contacts');

    return this.initialized
      .then(() => {
        this.telemetryService.record('rules-engine:tasks:dirty-contacts', RulesEngineCore.getDirtyContacts().length);
        this.cancelDebounce(this.ensureTaskFreshness, this.ensureTaskFreshnessTelemetryData);

        return RulesEngineCore
          .fetchTasksFor()
          .on('queued', telemetryData.queued)
          .on('running', telemetryData.start);
      })
      .then(telemetryData.passThrough)
      .then(this.translateTaskDocs);
  }

  fetchTaskDocsFor(contactIds) {
    const telemetryData = this.telemetryEntry('rules-engine:tasks:some-contacts');

    return this.initialized
    .then(() => {
      this.telemetryService.record('rules-engine:tasks:dirty-contacts', RulesEngineCore.getDirtyContacts().length);

      return RulesEngineCore
        .fetchTasksFor(contactIds)
        .on('queued', telemetryData.queued)
        .on('running', telemetryData.start);
    })
    .then(telemetryData.passThrough)
    .then(this.translateTaskDocs);
  }

  fetchTargets() {
    const telemetryData = this.telemetryEntry('rules-engine:targets');

    return this.initialized
    .then(() => {
      this.telemetryService.record('rules-engine:targets:dirty-contacts', RulesEngineCore.getDirtyContacts().length);
      this.cancelDebounce(this.ensureTargetFreshness, this.ensureTargetFreshnessTelemetryData);
      const relevantInterval = CalendarInterval.getCurrent(this.uhcMonthStartDate);
      return RulesEngineCore
        .fetchTargets(relevantInterval)
        .on('queued', telemetryData.queued)
        .on('running', telemetryData.start);
    })
    .then(telemetryData.passThrough);
  }

  monitorExternalChanges(replicationResult) {
    return this.initialized
      .then(() => {
        return replicationResult
          && replicationResult.docs
          && this.monitorExternalChanges(replicationResult.docs);
      });
  }
}
