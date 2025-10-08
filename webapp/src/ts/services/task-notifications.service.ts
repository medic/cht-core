import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';

const DEFAULT_MAX_NOTIFICATIONS = 8;

export interface Notification {
  _id: string,
  readyAt: number,
  title: string,
  contentText: string,
  dueDate: string,
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
    if (!this.isEnabled()) {
      return;
    }
    this.debouncedReload = _debounce(this.updateAndroidStore.bind(this), 1000, { maxWait: 10 * 1000 });
    this.subscribeToRulesEngine();
  }

  async get(): Promise<Notification[]> {
    if (!this.isEnabled()) {
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
    console.info('__________updating android notification store with________________', notifications);
    window.medicmobile_android?.updateTaskNotificationStore(JSON.stringify(notifications));
  }

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      const taskDocs = await this.rulesEngineService.fetchTaskDocsForAllContacts();
      const notifications: Notification[] = [];

      taskDocs.forEach(task => {
        const readyAt = this.getReadyStateTimestamp(task.stateHistory);
        const dueDate = task.emission.dueDate;
        notifications.push({
          _id: task._id,
          readyAt,
          title: task.emission.title,
          contentText: this.translateContentText(
            task.emission.title,
            task.emission.contact.name,
            task.emission.dueDate
          ),
          dueDate,
        });
      });

      return notifications
        .sort((a, b) => b.readyAt - a.readyAt)
        .slice(0, await this.getMaxNotificationSettings());

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
