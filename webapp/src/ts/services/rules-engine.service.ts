import { Injectable, OnDestroy } from '@angular/core';
import * as RegistrationUtils from '@medic/registration-utils';
import * as RulesEngineCore from '@medic/rules-engine';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { debounce as _debounce, uniq as _uniq } from 'lodash-es';

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
import { DbService } from '@mm-services/db.service';
import { CalendarIntervalService } from '@mm-services/calendar-interval.service';

interface DebounceActive {
  [key: string]: {
    active?: boolean;
    debounceRef?: any;
    telemetryDataEntry?: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RulesEngineCoreFactoryService {
  constructor(private dbService: DbService) {}

  get() {
    return RulesEngineCore(this.dbService.get());
  }
}

@Injectable({
  providedIn: 'root'
})
export class RulesEngineService implements OnDestroy {
  private rulesEngineCore;
  private readonly MAX_LINEAGE_DEPTH = 50;
  private readonly ENSURE_FRESHNESS_SECS = 120;
  private subscriptions: Subscription = new Subscription();
  private initialized;
  private uhcMonthStartDate;
  private debounceActive: DebounceActive = {};

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
    private translateFromService: TranslateFromService,
    private rulesEngineCoreFactoryService: RulesEngineCoreFactoryService,
    private calendarIntervalService: CalendarIntervalService
  ) {
    this.initialized = this.initialize();
    this.rulesEngineCore = this.rulesEngineCoreFactoryService.get();
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
            const rulesSettings = this.getRulesSettings(
              settingsDoc,
              userContactDoc,
              userSettingsDoc,
              canViewTasks,
              canViewTargets
            );
            const initializeTelemetryData = this.telemetryEntry('rules-engine:initialize', true);

            return this.rulesEngineCore
              .initialize(rulesSettings)
              .then(() => {
                const isEnabled = this.rulesEngineCore.isEnabled();

                if (isEnabled) {
                  this.assignMonthStartDate(settingsDoc);
                  this.monitorChanges(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);

                  const tasksDebounceRef = _debounce(() => {
                    this.debounceActive.tasks.active = false;
                    this.fetchTaskDocsForAllContacts();
                  }, this.ENSURE_FRESHNESS_SECS * 1000);

                  this.debounceActive['tasks'] = {
                    active: true,
                    telemetryDataEntry: this.telemetryEntry('rules-engine:ensureTaskFreshness:cancel', true),
                    debounceRef: tasksDebounceRef
                  };
                  this.debounceActive.tasks.debounceRef();

                  const targetsDebounceRef = _debounce(() => {
                    this.debounceActive.targets.active = false;
                    this.fetchTargets();
                  }, this.ENSURE_FRESHNESS_SECS * 1000);

                  this.debounceActive['targets'] = {
                    active: true,
                    telemetryDataEntry: this.telemetryEntry('rules-engine:ensureTargetFreshness:cancel', true),
                    debounceRef: targetsDebounceRef
                  };
                  this.debounceActive.targets.debounceRef();
                }

                initializeTelemetryData.record();
              });
          });
      });
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
    };

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

  private cancelDebounce(entity) {
    const debounceInfo = this.debounceActive[entity];

    if (!debounceInfo || !debounceInfo.debounceRef) {
      return;
    }

    if (debounceInfo.active) { // Debounced function is not executed or cancelled yet.
      debounceInfo.telemetryDataEntry.record();
    }

    debounceInfo.debounceRef.cancel();
    debounceInfo.active = false;
  }

  private getRulesSettings(settingsDoc, userContactDoc, userSettingsDoc, enableTasks, enableTargets) {
    const settingsTasks = settingsDoc && settingsDoc.tasks || {};
    const filterTargetByContext = (target) => target.context ?
      !!this.parseProvider.parse(target.context)({ user: userContactDoc }) : true;
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

        return this.rulesEngineCore
          .updateEmissionsFor(subjectIds)
          .then(telemetryData.passThrough);
      }
    });
    this.subscriptions.add(dirtyContactsSubscription);

    const userLineage = [];
    for (
      let current = userContactDoc;
      !!current && userLineage.length < this.MAX_LINEAGE_DEPTH;
      current = current.parent)
    {
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
    const rulesSettings = this.getRulesSettings(
      settingsDoc,
      userContactDoc,
      userSettingsDoc,
      canViewTasks,
      canViewTargets
    );
    this.rulesEngineCore.rulesConfigChange(rulesSettings);
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

  private updateEmissionExternalChanges(changedDocs) {
    const contactsWithUpdatedTasks = changedDocs
      .filter(doc => doc.type === 'task')
      .map(doc => doc.requester);

    if (!contactsWithUpdatedTasks.length) {
      return;
    }

    return this.rulesEngineCore.updateEmissionsFor(_uniq(contactsWithUpdatedTasks));
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
    return this.initialized.then(this.rulesEngineCore.isEnabled);
  }

  fetchTaskDocsForAllContacts() {
    const telemetryData = this.telemetryEntry('rules-engine:tasks:all-contacts');

    return this.initialized
      .then(() => {
        this.telemetryService.record(
          'rules-engine:tasks:dirty-contacts',
          this.rulesEngineCore.getDirtyContacts().length
        );
        this.cancelDebounce('tasks');
        return this.rulesEngineCore
          .fetchTasksFor()
          .on('queued', telemetryData.queued)
          .on('running', telemetryData.start);
      })
      .then(telemetryData.passThrough)
      .then(taskDocs => this.translateTaskDocs(taskDocs));
  }

  fetchTaskDocsFor(contactIds) {
    const telemetryData = this.telemetryEntry('rules-engine:tasks:some-contacts');

    return this.initialized
      .then(() => {
        this.telemetryService.record(
          'rules-engine:tasks:dirty-contacts',
          this.rulesEngineCore.getDirtyContacts().length
        );

        return this.rulesEngineCore
          .fetchTasksFor(contactIds)
          .on('queued', telemetryData.queued)
          .on('running', telemetryData.start);
      })
      .then(telemetryData.passThrough)
      .then(taskDocs => this.translateTaskDocs(taskDocs));
  }

  fetchTargets() {
    const telemetryData = this.telemetryEntry('rules-engine:targets');

    return this.initialized
      .then(() => {
        this.telemetryService.record(
          'rules-engine:targets:dirty-contacts',
          this.rulesEngineCore.getDirtyContacts().length
        );
        this.cancelDebounce('targets');
        const relevantInterval = this.calendarIntervalService.getCurrent(this.uhcMonthStartDate);
        return this.rulesEngineCore
          .fetchTargets(relevantInterval)
          .on('queued', telemetryData.queued)
          .on('running', telemetryData.start);
      })
      .then(telemetryData.passThrough);
  }

  monitorExternalChanges(replicationResult?) {
    return this.initialized.then(() => {
      return replicationResult
        && replicationResult.docs
        && this.updateEmissionExternalChanges(replicationResult.docs);
    });
  }
}
