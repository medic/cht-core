import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';
import * as moment from 'moment';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';
import { orderByDueDateAndPriority } from '@medic/task-utils';

const DEFAULT_MAX_NOTIFICATIONS = 8;

export interface Notification {
  _id: string,
  title: string,
  contentText: string,
  endDate: number,
  dueDate: number,
  readyAt: number
}

@Injectable({
  providedIn: 'root'
})
export class TasksNotificationService implements OnDestroy {

  private readonly subscription = new Subscription();
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
    this.subscribeToRulesEngine();
    this.updateAndroidStore();
  }

  private async isEnabled() {
    const isRulesEngineEnabled = await this.rulesEngineService.isEnabled();
    const canGetNotifications = await this.authService.has('can_get_task_notifications');
    return isRulesEngineEnabled && canGetNotifications;
  }

  private subscribeToRulesEngine() {
    const debouncedReload = _debounce(this.updateAndroidStore.bind(this), 1000, { maxWait: 10 * 1000 });
    const rulesEngineSubscription = this.rulesEngineService.contactsMarkedAsDirty(() => {
      debouncedReload.cancel();
      return debouncedReload();
    });
    this.subscription.add(rulesEngineSubscription);
  }

  private async updateAndroidStore(): Promise<void> {
    const notifications = await this.fetchNotifications();
    const maxNotifications = await this.getMaxNotificationSettings();
    window.medicmobile_android?.updateTaskNotificationStore(JSON.stringify(notifications), maxNotifications);
  }

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      const taskDocs = await this.rulesEngineService.fetchTaskDocsForAllContacts();
      let notifications: Notification[] = [];

      for (const task of taskDocs) {
        notifications.push({
          _id: task._id,
          readyAt: this.getReadyStateTimestamp(task.stateHistory),
          title: task.emission.title,
          contentText: this.translateContentText(
            task.emission.title,
            task.emission.contact.name,
          ),
          endDate: moment(task.emission.endDate).valueOf(),
          dueDate: moment(task.emission.dueDate).valueOf()
        });
      }
      notifications = notifications.sort(orderByDueDateAndPriority);
      return notifications.slice(0, 100);

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
    return DEFAULT_MAX_NOTIFICATIONS;
  }

  private translateContentText(taskName: string, contact: string): string {
    const key = 'android.notification.tasks.contentText';
    return this.translateService.instant(key, { taskName, contact });
  }

}
