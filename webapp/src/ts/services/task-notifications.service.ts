import { Injectable } from '@angular/core';
import * as moment from 'moment';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { SettingsService } from '@mm-services/settings.service';

const TASK_NOTIFICATION_DAY = 'cht-task-notification-day';
const LATEST_NOTIFICATION_TIMESTAMP = 'cht-task-notification-timestamp';
const DEFAULT_MAX_NOTIFICATIONS = 10;

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
export class TasksNotificationService {

  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private readonly translateService: TranslateService,
    private readonly formatDateService: FormatDateService,
    private readonly settingsService: SettingsService,
  ) { }

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      const isEnabled = await this.rulesEngineService.isEnabled();
      if (!isEnabled) {
        return [];
      }
      const today = moment().format('YYYY-MM-DD');
      let latestNotificationTimestamp = this.getLatestNotificationTimestamp();
      const taskDocs = await this.rulesEngineService.fetchTaskDocsForAllContacts();

      let notifications: Notification[] = [];

      taskDocs.forEach(task => {
        const readyAt = this.getReadyStateTimestamp(task.stateHistory);
        const dueDate = task.emission.dueDate;
        if (dueDate <= today && readyAt > latestNotificationTimestamp) {
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
        }
      });

      notifications = notifications.sort((a, b) => b.readyAt - a.readyAt);
      notifications = notifications.slice(0, await this.getMaxNotificationSettings());
      latestNotificationTimestamp = notifications[0]?.readyAt ?? latestNotificationTimestamp;
      window.localStorage.setItem(LATEST_NOTIFICATION_TIMESTAMP, String(latestNotificationTimestamp));
      return notifications;

    } catch (exception) {
      console.error('fetchNotifications(): Error fetching tasks', exception);
      return [];
    }
  }

  private getReadyStateTimestamp(stateHistory): number {
    const readyState = stateHistory.find(state => state.state === 'Ready');
    return readyState ? readyState.timestamp : 0;
  }

  private getMaxNotificationSettings(): Promise<number> {
    return this.settingsService
      .get()
      .then((res) => {
        if (res && typeof res.max_task_notifications === 'number' && res.max_task_notifications >= 0) {
          return res.max_task_notifications;
        }
        return DEFAULT_MAX_NOTIFICATIONS;
      })
      .catch((err) => {
        console.error('Error fetching notifications settings', err);
        return DEFAULT_MAX_NOTIFICATIONS;
      });
  }

  private getLatestNotificationTimestamp(): number {
    if (this.isNewDay()) {
      window.localStorage.setItem(TASK_NOTIFICATION_DAY, String(moment().startOf('day').valueOf()));
      return 0;
    }
    return Number(window.localStorage.getItem(LATEST_NOTIFICATION_TIMESTAMP));
  }

  private isNewDay(): boolean {
    const timestampToday = Number(window.localStorage.getItem(TASK_NOTIFICATION_DAY));
    return !moment().isSame(timestampToday, 'day');
  }

  private translateContentText(taskName: string, contact: string, dueDate: string): string {
    const key = 'android.notification.tasks.contentText';
    const due = this.formatDateService.relative(dueDate, { task: true });
    return this.translateService.instant(key, { taskName, contact, due });
  }

  async get(): Promise<Notification[]> {
    return await this.fetchNotifications();
  }
}
