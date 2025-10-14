import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';
import * as moment from 'moment';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';

const DEFAULT_MAX_NOTIFICATIONS = 8;

export interface Notification {
  _id: string,
  title: string,
  contentText: string,
  endDate: number,
  readyAt: number
}

@Injectable({
  providedIn: 'root'
})
export class TasksNotificationService implements OnDestroy {

  private debouncedReload;
  private canGetNotifications;
  private isRulesEngineEnabled;
  subscription = new Subscription();
  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private readonly translateService: TranslateService,
    private readonly formatDateService: FormatDateService,
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
  ) { }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async initOnAndroid() {
    if (!await this.isEnabled()) {
      return;
    }
    this.debouncedReload = _debounce(this.updateAndroidStore.bind(this), 1000, { maxWait: 10 * 1000 });
    this.subscribeToRulesEngine();
    this.updateAndroidStore();
  }

  async get(): Promise<Notification[]> {
    if (!await this.isEnabled()) {
      return [];
    }
    return await this.fetchNotifications();
  }

  private async isEnabled() {
    this.isRulesEngineEnabled = await this.rulesEngineService.isEnabled();
    this.canGetNotifications = await this.authService.has('can_get_task_notifications');
    return this.isRulesEngineEnabled && this.canGetNotifications;
  }

  private subscribeToRulesEngine() {
    const rulesEngineSubscription = this.rulesEngineService.contactsMarkedAsDirty(() => {
      this.debouncedReload.cancel();
      return this.debouncedReload();
    });
    this.subscription.add(rulesEngineSubscription);
  }

  private async updateAndroidStore(): Promise<void> {
    const notifications = await this.fetchNotifications();
    window.medicmobile_android?.updateTaskNotificationStore(JSON.stringify(notifications));
  }

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      const today = moment().format('YYYY-MM-DD');
      const taskDocs = await this.rulesEngineService.fetchTaskDocsForAllContacts();
      let notifications: Notification[] = [];

      for (const task of taskDocs) {
        const dueDate = task.emission.dueDate;
        if (dueDate <= today) {
          notifications.push({
            _id: task._id,
            readyAt: this.getReadyStateTimestamp(task.stateHistory),
            title: task.emission.title,
            contentText: this.translateContentText(
              task.emission.title,
              task.emission.contact.name,
              task.emission.dueDate
            ),
            endDate: new Date(task.emission.endDate).getTime()
          });
        }
      }
      notifications = notifications.sort((a, b) => b.readyAt - a.readyAt);
      return notifications.slice(0, await this.getMaxNotificationSettings());

    } catch (exception) {
      console.error('fetchNotifications(): Error fetching tasks', exception);
      return [];
    }
  }

  private getReadyStateTimestamp(stateHistory): number {
    const readyState = stateHistory.find(state => state.state === 'Ready');
    return readyState ? readyState.timestamp : 0;
  }

  private async getMaxNotificationSettings(): Promise<number> {
    const settings = await this.settingsService.get();
    if (settings?.tasks?.max_task_notifications) {
      return settings.tasks.max_task_notifications;
    }
    console.warn('Invalid or missing max_task_notifications setting, using default value');
    return DEFAULT_MAX_NOTIFICATIONS;
  }

  private translateContentText(taskName: string, contact: string, dueDate: string): string {
    const key = 'android.notification.tasks.contentText';
    const due = this.formatDateService.relative(dueDate, { task: true });
    return this.translateService.instant(key, { taskName, contact, due });
  }

}
