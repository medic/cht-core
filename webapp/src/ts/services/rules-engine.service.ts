import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as RegistrationUtils from '@medic/registration-utils';
import * as RulesEngineCore from '@medic/rules-engine';
import { Subject, Subscription } from 'rxjs';
import { debounce as _debounce, uniq as _uniq } from 'lodash-es';
import * as moment from 'moment';

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
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { TranslateService } from '@mm-services/translate.service';
import { PerformanceService } from '@mm-services/performance.service';

interface DebounceActive {
  [key: string]: {
    active?: boolean;
    debounceRef?: any;
    performance?: any;
    params?:any;
    promise?:Promise<any>;
    resolve?:any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RulesEngineCoreFactoryService {
  constructor(
    private dbService: DbService
  ) {}

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
  private readonly ENSURE_FRESHNESS_MILLIS = 120 * 1000;
  private readonly DEBOUNCE_CHANGE_MILLIS = 1000;
  private readonly CHANGE_WATCHER_KEY = 'mark-contacts-dirty';
  private readonly FRESHNESS_KEY = 'freshness';
  private subscriptions: Subscription = new Subscription();
  private initialized;
  private uhcMonthStartDate;
  private debounceActive: DebounceActive = {};
  private observable = new Subject();

  constructor(
    private translateService:TranslateService,
    private authService:AuthService,
    private sessionService:SessionService,
    private settingsService:SettingsService,
    private telemetryService:TelemetryService,
    private performanceService:PerformanceService,
    private uhcSettingsService:UHCSettingsService,
    private userContactService:UserContactService,
    private userSettingsService:UserSettingsService,
    private parseProvider:ParseProvider,
    private changesService:ChangesService,
    private contactTypesService:ContactTypesService,
    private translateFromService:TranslateFromService,
    private rulesEngineCoreFactoryService:RulesEngineCoreFactoryService,
    private calendarIntervalService:CalendarIntervalService,
    private ngZone:NgZone,
    private chtDatasourceService:CHTDatasourceService
  ) {
    this.initialized = this.initialize();
    this.rulesEngineCore = this.rulesEngineCoreFactoryService.get();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initialize() {
    return this.ngZone.runOutsideAngular(() => this._initialize());
  }

  private async _initialize() {
    const canViewTasks = await this.authService.has('can_view_tasks');
    const canViewTargets = await this.authService.has('can_view_analytics');

    const hasPermissions = canViewTargets || canViewTasks;
    if (!hasPermissions || this.sessionService.isOnlineOnly()) {
      return false;
    }

    const [settingsDoc, userContactDoc, userSettingsDoc, chtScriptApi] =
      await Promise.all([
        this.settingsService.get(),
        this.userContactService.get(),
        this.userSettingsService.get(),
        this.chtDatasourceService.get()
      ]);

    const rulesEngineContext = this.getRulesEngineContext(
      settingsDoc,
      userContactDoc,
      userSettingsDoc,
      canViewTasks,
      canViewTargets,
      chtScriptApi
    );

    const rulesSettings = this.getRulesSettings(rulesEngineContext);
    const trackPerformance = this.performanceService.track();
    const trackName = { name: this.getTelemetryTrackName('initialize') };

    await this.rulesEngineCore.initialize(rulesSettings);
    const isEnabled = this.rulesEngineCore.isEnabled();

    if (!isEnabled) {
      trackPerformance?.stop(trackName);
      return false;
    }

    this.assignMonthStartDate(settingsDoc);
    this.monitorChanges(rulesEngineContext);

    const rulesDebounceRef = _debounce(() => {
      this.debounceActive[this.FRESHNESS_KEY].active = false;
      this.refreshEmissions();
    }, this.ENSURE_FRESHNESS_MILLIS);

    this.debounceActive[this.FRESHNESS_KEY] = {
      active: true,
      performance: {
        name: this.getTelemetryTrackName( 'background-refresh', 'cancel'),
        track: this.performanceService.track()
      },
      debounceRef: rulesDebounceRef
    };
    this.debounceActive[this.FRESHNESS_KEY].debounceRef();

    trackPerformance?.stop(trackName);

    return true;
  }

  private cancelDebounce(entity) {
    const debounceInfo = this.debounceActive[entity];

    if (!debounceInfo?.debounceRef || !debounceInfo?.active) {
      return;
    }

    if (debounceInfo.active) { // Debounced function is not executed or cancelled yet.
      debounceInfo.performance.track.stop({ name: debounceInfo.performance.name });
    }

    debounceInfo.debounceRef.cancel();
    debounceInfo.active = false;
  }

  private waitForDebounce(entity):Promise<any> | undefined {
    if (this.debounceActive[entity]?.active && this.debounceActive[entity]?.promise) {
      return this.debounceActive[entity].promise;
    }

    return Promise.resolve();
  }

  private getRulesEngineContext(settingsDoc, userContactDoc, userSettingsDoc, enableTasks, enableTargets, chtScriptApi){
    return {
      settingsDoc,
      userContactDoc,
      userSettingsDoc,
      enableTasks,
      enableTargets,
      chtScriptApi
    };
  }

  private getRulesSettings(rulesEngineContext) {
    const settingsTasks = rulesEngineContext?.settingsDoc?.tasks || {};
    const filterTargetByContext = (target) => target.context ?
      !!this.parseProvider.parse(target.context)({ user: rulesEngineContext.userContactDoc }) : true;
    const targets = settingsTasks?.targets?.items || [];

    return {
      rules: settingsTasks.rules,
      taskSchedules: settingsTasks.schedules,
      targets: targets.filter(filterTargetByContext),
      enableTasks: rulesEngineContext.enableTasks,
      enableTargets: rulesEngineContext.enableTargets,
      contact: rulesEngineContext.userContactDoc,
      user: rulesEngineContext.userSettingsDoc,
      rulesAreDeclarative: !!rulesEngineContext.settingsDoc?.tasks?.isDeclarative,
      monthStartDate: this.uhcSettingsService.getMonthStartDate(rulesEngineContext.settingsDoc),
      chtScriptApi: rulesEngineContext.chtScriptApi
    };
  }

  private isReport(doc) {
    return doc.type === 'data_record' && !!doc.form;
  }

  private dirtyContactCallback(change) {
    const subjectIds = [this.isReport(change.doc) ? RegistrationUtils.getSubjectId(change.doc) : change.id];
    this.observable.next(subjectIds);

    if (this.debounceActive[this.CHANGE_WATCHER_KEY]?.active) {
      const oldSubjectIds = this.debounceActive[this.CHANGE_WATCHER_KEY].params;
      if (oldSubjectIds) {
        subjectIds.push(...oldSubjectIds);
      }

      this.debounceActive[this.CHANGE_WATCHER_KEY].params = subjectIds;
      this.debounceActive[this.CHANGE_WATCHER_KEY].debounceRef();
      return;
    }

    const trackPerformance = this.performanceService.track();
    let resolve;
    const promise = new Promise(r => resolve = r);

    const debounceRef = _debounce(async () => {
      this.debounceActive[this.CHANGE_WATCHER_KEY].active = false;
      this.debounceActive[this.CHANGE_WATCHER_KEY].resolve();

      const contactIds = this.debounceActive[this.CHANGE_WATCHER_KEY].params;
      this.telemetryService.record(this.getTelemetryTrackName('refresh', 'dirty-contacts'), contactIds.length);

      await this.rulesEngineCore.updateEmissionsFor(contactIds);
      trackPerformance?.stop({ name: this.getTelemetryTrackName('refresh') });
    }, this.DEBOUNCE_CHANGE_MILLIS);

    this.debounceActive[this.CHANGE_WATCHER_KEY] = {
      active: true,
      promise: promise,
      resolve: resolve,
      performance: {
        name: this.getTelemetryTrackName('refresh', 'cancel'),
        track: this.performanceService.track()
      },
      debounceRef: debounceRef,
      params: subjectIds,
    };
    this.debounceActive[this.CHANGE_WATCHER_KEY].debounceRef();
  }

  private monitorContactChanges() {
    const dirtyContactsSubscription = this.changesService.subscribe({
      key: this.CHANGE_WATCHER_KEY,
      filter: change => !!change.doc && (this.contactTypesService.includes(change.doc) || this.isReport(change.doc)),
      callback: change => this.dirtyContactCallback(change)
    });
    this.subscriptions.add(dirtyContactsSubscription);
  }

  private monitorConfigChanges(rulesEngineContext) {
    const userLineage: any[] = [];
    for (
      let current = rulesEngineContext.userContactDoc;
      !!current && userLineage.length < this.MAX_LINEAGE_DEPTH;
      current = current.parent
    ) {
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
              rulesEngineContext.userContactDoc = updatedUser;
              this.rulesConfigChange(rulesEngineContext);
            });
        }

        rulesEngineContext.settingsDoc = change.doc.settings;
        this.rulesConfigChange(rulesEngineContext);
      },
    });
    this.subscriptions.add(rulesUpdateSubscription);
  }

  private monitorChanges(rulesEngineContext) {
    this.monitorContactChanges();
    this.monitorConfigChanges(rulesEngineContext);
  }

  private rulesConfigChange(rulesEngineContext) {
    const rulesSettings = this.getRulesSettings(rulesEngineContext);
    this.rulesEngineCore.rulesConfigChange(rulesSettings);
    this.assignMonthStartDate(rulesEngineContext.settingsDoc);
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

  private hydrateTaskDocs(taskDocs: { _id: string; emission?: any; owner: string }[] = []) {
    taskDocs.forEach(taskDoc => {
      const { emission } = taskDoc;
      if (!emission) {
        return;
      }

      const dueDate = moment(emission.dueDate, 'YYYY-MM-DD');
      emission.overdue = dueDate.isBefore(moment());
      emission.date = new Date(dueDate.valueOf());
      emission.title = this.translateProperty(emission.title, emission);
      emission.priorityLabel = this.translateProperty(emission.priorityLabel, emission);
      emission.owner = taskDoc.owner;
    });

    return taskDocs;
  }

  private assignMonthStartDate(settingsDoc) {
    this.uhcMonthStartDate = this.uhcSettingsService.getMonthStartDate(settingsDoc);
  }

  isEnabled() {
    return this.initialized;
  }

  private refreshEmissions() {
    return this.ngZone.runOutsideAngular(() => this._refreshEmissions());
  }

  private async _refreshEmissions() {
    const trackName = this.getTelemetryTrackName('background-refresh');
    let trackPerformanceQueueing;
    let trackPerformanceRunning;

    await this.initialized;
    this.telemetryService.record(
      this.getTelemetryTrackName('background-refresh', 'dirty-contacts'),
      this.rulesEngineCore.getDirtyContacts().length
    );
    this.cancelDebounce(this.FRESHNESS_KEY);

    await this.rulesEngineCore
      .refreshEmissionsFor()
      .on('queued', () => trackPerformanceQueueing = this.performanceService.track())
      .on('running', () => {
        trackPerformanceRunning = this.performanceService.track();
        trackPerformanceQueueing?.stop({ name: `${trackName}:queued` });
      });

    if (!trackPerformanceRunning) {
      trackPerformanceRunning = this.performanceService.track();
    }
    trackPerformanceRunning.stop({ name: trackName });
  }

  fetchTaskDocsForAllContacts() {
    return this.ngZone.runOutsideAngular(() => this._fetchTaskDocsForAllContacts());
  }

  private async _fetchTaskDocsForAllContacts() {
    const trackName = this.getTelemetryTrackName('tasks', 'all-contacts');
    let trackPerformanceQueueing;
    let trackPerformanceRunning;

    await this.initialized;
    this.telemetryService.record(
      this.getTelemetryTrackName('tasks', 'dirty-contacts'),
      this.rulesEngineCore.getDirtyContacts().length
    );
    this.cancelDebounce(this.FRESHNESS_KEY);
    await this.waitForDebounce(this.CHANGE_WATCHER_KEY);
    const taskDocs = await this.rulesEngineCore
      .fetchTasksFor()
      .on('queued', () => trackPerformanceQueueing = this.performanceService.track())
      .on('running', () => {
        trackPerformanceRunning = this.performanceService.track();
        trackPerformanceQueueing?.stop({ name: `${trackName}:queued` });
      });

    if (!trackPerformanceRunning) {
      trackPerformanceRunning = this.performanceService.track();
    }
    trackPerformanceRunning.stop({ name: trackName });
    return this.hydrateTaskDocs(taskDocs);
  }

  fetchTaskDocsFor(contactIds) {
    return this.ngZone.runOutsideAngular(() => this._fetchTaskDocsFor(contactIds));
  }

  private async _fetchTaskDocsFor(contactIds) {
    const trackName = this.getTelemetryTrackName('tasks', 'some-contacts');
    let trackPerformanceQueueing;
    let trackPerformanceRunning;

    await this.initialized;
    this.telemetryService.record(
      this.getTelemetryTrackName('tasks', 'dirty-contacts'),
      this.rulesEngineCore.getDirtyContacts().length
    );
    await this.waitForDebounce(this.CHANGE_WATCHER_KEY);
    const taskDocs = await this.rulesEngineCore
      .fetchTasksFor(contactIds)
      .on('queued', () => trackPerformanceQueueing = this.performanceService.track())
      .on('running', () => {
        trackPerformanceRunning = this.performanceService.track();
        trackPerformanceQueueing?.stop({ name: `${trackName}:queued` });
      });

    if (!trackPerformanceRunning) {
      trackPerformanceRunning = this.performanceService.track();
    }
    trackPerformanceRunning?.stop({ name: trackName });
    return this.hydrateTaskDocs(taskDocs);
  }

  fetchTasksBreakdown(contactIds?) {
    return this.ngZone.runOutsideAngular(() => this._fetchTasksBreakdown(contactIds));
  }

  private _fetchTasksBreakdown(contactIds?) {
    const trackName = this.getTelemetryTrackName('tasks-breakdown', contactIds ? 'some-contacts' : 'all-contacts');
    const trackPerformance = this.performanceService.track();
    return this.initialized
      .then(() => this.rulesEngineCore.fetchTasksBreakdown(contactIds))
      .then(taskBreakdown => {
        trackPerformance?.stop({ name: trackName });
        return taskBreakdown;
      });
  }

  fetchTargets() {
    return this.ngZone.runOutsideAngular(() => this._fetchTargets());
  }

  private async _fetchTargets(): Promise<Target[]> {
    const trackName = this.getTelemetryTrackName('targets');
    let trackPerformanceQueueing;
    let trackPerformanceRunning;

    await this.initialized;
    this.telemetryService.record(
      'rules-engine:targets:dirty-contacts',
      this.rulesEngineCore.getDirtyContacts().length
    );
    this.cancelDebounce(this.FRESHNESS_KEY);
    await this.waitForDebounce(this.CHANGE_WATCHER_KEY);

    const relevantInterval = this.calendarIntervalService.getCurrent(this.uhcMonthStartDate);
    const targets = await this.rulesEngineCore
      .fetchTargets(relevantInterval)
      .on('queued', () => trackPerformanceQueueing = this.performanceService.track())
      .on('running', () => {
        trackPerformanceRunning = this.performanceService.track();
        trackPerformanceQueueing?.stop({ name: `${trackName}:queued` });
      });

    if (!trackPerformanceRunning) {
      trackPerformanceRunning = this.performanceService.track();
    }
    trackPerformanceRunning?.stop({ name: trackName });
    return targets;
  }

  async monitorExternalChanges(replicationResult?) {
    await this.initialized;
    return replicationResult?.docs && this.updateEmissionExternalChanges(replicationResult.docs);
  }

  contactsMarkedAsDirty(callback) {
    return this.observable.subscribe(callback);
  }

  private getTelemetryTrackName(...params:string[]) {
    return ['rules-engine', ...params].join(':');
  }

}

export enum TargetType {
  COUNT = 'count',
  PERCENT = 'percent'
}

export interface TargetValue {
  pass: number;
  percent?: number;
  total: number;
}

export interface Target {
  id: string;
  type: TargetType;
  icon: string;
  translation_key: string;
  subtitle_translation_key: string;
  goal: number;
  value: TargetValue;
}
